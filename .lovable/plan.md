# Fix `get-typeform-alerts` Boot Failure

## Síntoma
- UI muestra "Failed to send a request to the Edge Function".
- No hay logs para `get-typeform-alerts` → el deploy/boot falló silenciosamente.

## Causa probable
El import `import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'` no es un subpath válido del paquete y revienta al cargar el módulo. Todas las demás funciones del proyecto usan `../_shared/cors.ts`.

## Cambios

### 1. `supabase/functions/get-typeform-alerts/index.ts`
- Reemplazar el import roto por el helper local del proyecto:
  ```ts
  import { corsHeaders } from "../_shared/cors.ts";
  ```
- Añadir logs de boot defensivos (sin exponer valores) para futuros diagnósticos:
  ```ts
  console.log("[get-typeform-alerts] boot", {
    hasToken: !!Deno.env.get("TYPEFORM_API_TOKEN"),
    hasTvId: !!Deno.env.get("TYPEFORM_TV_FORM_ID"),
  });
  ```
- Aceptar también `GET` (no solo `POST`) leyendo query params como fallback, por si el invoke envía body vacío.

### 2. `supabase/config.toml`
- Registrar explícitamente la función para forzar redeploy limpio:
  ```toml
  [functions.get-typeform-alerts]
  verify_jwt = true
  ```

## Verificación
1. Refrescar la página `/envio-alertas`.
2. Revisar `supabase--edge_function_logs` para `get-typeform-alerts` y confirmar el boot log.
3. Si Typeform responde 401, mostrar mensaje claro (ya implementado en código → status 503 con `typeform_token_missing` / propagación de error).

## Sin cambios
- UI, hook React Query, cards, dialog — todo se queda igual; solo arreglamos el boot.
