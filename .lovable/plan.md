## Diagnóstico

El sistema de **Alertas Enviadas** (sync Typeform → tabla `typeform_responses`) **dejó de actualizarse el 15 de junio 2026 a las 13:28 UTC**. El cron `sync-typeform-responses-10m` sigue corriendo cada 10 minutos y la última corrida fue hoy 17-jun 15:50, pero ambos formularios (TV `O9wk9fC1` y Radio `ngv41rGM`) están en `last_run_status: error` con el mismo mensaje de Typeform:

```
400 BAD_REQUEST — invalid argument (key=since, value="2026-06-15T13:16:19+00:00"):
invalid time passed. Accepted values are either an integer timestamp...
```

### Causa raíz
En `supabase/functions/sync-typeform-responses/index.ts` (línea 81 y 96) el parámetro `since` se pasa tal cual viene de Postgres (`2026-06-15T13:16:19+00:00`). La API de Typeform **no acepta el offset `+00:00`**; solo admite Unix timestamp (segundos) o ISO 8601 con sufijo `Z`. Por eso cada corrida desde el 15-jun falla antes de traer una sola respuesta y `last_synced_at` se queda congelado, lo cual repite el mismo error indefinidamente.

Hay **~2 días de respuestas de Typeform sin replicar** en Supabase, y la UI `/envio-alertas` muestra "Sin respuestas" cuando se filtra por las últimas horas.

## Plan de corrección

1. **Normalizar `since` antes de enviarlo a Typeform** en `sync-typeform-responses/index.ts`:
   - Convertir cualquier valor de `last_synced_at` (que viene como `timestamptz`) a Unix timestamp en segundos: `Math.floor(new Date(since).getTime() / 1000)`.
   - Aplicar la misma conversión al `sinceOverride` recibido por body, para que llamadas manuales (`{"since":"..."}`) también funcionen.

2. **Limpiar el estado de error y forzar un re-sync inmediato** ejecutando la edge function una vez con `{"since":"2026-06-15T13:00:00Z"}` (timestamp anterior al último éxito) para recuperar las respuestas perdidas de los últimos 2 días. La función ya hace upsert por `(form_id, token)` así que no duplicará.

3. **Validar**:
   - `last_run_status = 'ok'` y `last_error IS NULL` en ambos formularios.
   - `MAX(submitted_at)` en `typeform_responses` debe acercarse a "hace minutos", no al 15-jun.
   - Refrescar `/envio-alertas` y confirmar que aparecen respuestas posteriores al 15-jun.

### Fuera de alcance
- No se toca el cron, la UI, la normalización de campos, ni `get-typeform-alerts`. El bug es de un solo parámetro mal formateado en una función edge.
