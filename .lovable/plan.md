## Problema

El runtime error muestra:
```
speech_model is deprecated. Use "speech_models" instead.
```

El SDK de AssemblyAI ya no acepta `speech_model: 'universal-2'` (singular) — ahora requiere `speech_models: ['universal-2']` (array, plural). El fix anterior cambió el valor pero no el nombre del campo, así que sigue dando 400.

## Fix

En `supabase/functions/transcribe-audio/index.ts` (línea ~89, dentro del `transcribeAudio({...})`):

- Reemplazar:
  ```ts
  speech_model: 'universal-2',
  ```
  por:
  ```ts
  speech_models: ['universal-2'],
  ```

Eso es todo — no se toca otra cosa. Después de guardar, la edge function se redeploya automáticamente y la próxima transcripción de radio debe completar (200 + texto) sin el error de AssemblyAI.

## Validación post-deploy

1. Subir un MP3 corto desde `/radio` y confirmar que el proceso llega al 100% y muestra el texto.
2. Revisar logs de `transcribe-audio`: ya no debe aparecer "speech_model is deprecated".
