## Diagnóstico real (basado en logs de Edge Functions)

Las transcripciones de radio fallan por **dos errores distintos**, no por un FK violation de `user_id`:

### 1. `transcribe-audio` (AssemblyAI, ruta principal) → 400
```
The 'nano' speech model has been deprecated and is no longer available.
Use speech_models: ["universal-3-pro", "universal-2"] instead.
```
En `supabase/functions/transcribe-audio/index.ts:89` se envía `speech_model: 'nano'`. AssemblyAI lo retiró, por eso **toda** corrida desde hace días devuelve 400 antes de transcribir.

### 2. `secure-transcribe` (OpenAI Whisper, fallback) → PGRST204
```
Could not find the 'metadata' column of 'radio_transcriptions' in the schema cache
```
En `supabase/functions/secure-transcribe/index.ts:270` se hace `insert({ user_id, transcription_text, metadata: {...} })`, pero la tabla `radio_transcriptions` **no tiene columna `metadata`** (sólo `analysis_result`, `emisora`, `programa`, `horario`, `transcription_text`, `user_id`). El fallback transcribe bien pero no logra persistir.

> Nota: no hay evidencia en los logs de un FK violation por `user_id`. El `userId` que llega (`e74eccbf-…`) es un UUID válido. La hipótesis del brief de "invalid user_id" no aplica a este proyecto — el bug real son los dos puntos de arriba.

## Plan de corrección

1. **Arreglar AssemblyAI** en `transcribe-audio/index.ts`:
   - Reemplazar `speech_model: 'nano'` por `speech_model: 'universal-2'` (el sucesor recomendado, soporta español y speaker labels).

2. **Arreglar persistencia del fallback** en `secure-transcribe/index.ts`:
   - Reemplazar el campo inexistente `metadata` por `analysis_result` en el `.insert()` a `radio_transcriptions` (es `Json | null` y es donde el resto del sistema guarda metadatos).

3. **Endurecer manejo de errores de DB** en ambas funciones (defensa en profundidad, alineado con el brief):
   - Validar que `userId` sea un UUID antes del insert; si no, devolver 400 claro en vez de propagar el error de FK.
   - Envolver el insert en try/catch que ya existe en `secure-transcribe` y replicarlo en `transcribe-audio` para que un fallo de DB no aborte la respuesta de transcripción al usuario.

4. **Validación post-deploy** (las edge functions se redeploys solas al guardar):
   - Subir un audio corto desde `/radio` y confirmar 200 + texto.
   - Revisar logs de `transcribe-audio`: ya no debe aparecer el error de `nano`.
   - `SELECT COUNT(*), MAX(created_at) FROM radio_transcriptions WHERE created_at > now() - interval '1 hour'` debe mostrar filas nuevas.

### Fuera de alcance
- No se toca el schema de `radio_transcriptions` (no hace falta; la columna correcta ya existe).
- No se toca el flujo de Typeform / Alertas Enviadas (problema distinto, ya resuelto).
- No se cambia auth ni el frontend de Radio.
