# Alertas Enviadas — Typeform Responses Redesign

Reemplazar el formulario placeholder actual por una galería de respuestas reales de los dos formularios de Typeform (TV y Radio), presentadas como tarjetas estéticas tipo "Client Spotlight".

## 1. Secret & API

- Pedir el secret `TYPEFORM_API_TOKEN` (Personal Access Token de Typeform → admin.typeform.com → Settings → Personal tokens, scope `responses:read`, `forms:read`).
- Form IDs configurables como constantes en el edge function:
  - `TV_FORM_ID` (de los screenshots: *Formulario de Alerta - Monitoreo TV Publi…*)
  - `RADIO_FORM_ID` = `01JEWES3GA7PPQN2SPRNHSVHPG` (ya conocido en `TypeformAlert.tsx`)
  - Si TV ID aún no confirmado, mostrar empty-state amigable en esa pestaña hasta proveerlo.

## 2. Edge function: `get-typeform-alerts`

`supabase/functions/get-typeform-alerts/index.ts`

- CORS estándar + JWT validation (usuario autenticado).
- Query params: `form` = `tv` | `radio` | `all`, `page_size` (default 25), `since` ISO date opcional, `search` opcional.
- Llama `GET https://api.typeform.com/forms/{form_id}/responses?page_size=...&since=...&query=...` con `Authorization: Bearer ${TYPEFORM_API_TOKEN}`.
- Una sola llamada también obtiene el schema: `GET /forms/{form_id}` para mapear `field.id → field.title` y `choice.id → choice.label`.
- Normaliza cada `item` a un objeto `AlertResponse` estable:
  ```
  {
    id, formType: 'tv'|'radio', submittedAt,
    channel,        // "Canal de TV" / emisora
    program,        // "Programas De ..."
    title,          // "Título de la Noticia"
    summary,        // "Resumen de la Noticia o Evento"
    category,       // "Categoría"
    tags: string[],
    clients: string[], // "Lista de Emails" → nombres de clientes
    rawAnswers      // fallback para campos no mapeados
  }
  ```
- Cache en memoria del edge function (5 min) por `form` para reducir cuota de Typeform.
- Devuelve `{ items, total, page_count }`.

## 3. Hook React Query

`src/hooks/use-typeform-alerts.ts`

- `useTypeformAlerts({ form, search, since })` → `supabase.functions.invoke('get-typeform-alerts', { body: {...} })`.
- `staleTime: 5min`, `refetchOnWindowFocus: false`.
- Función `refresh()` que invalida la query (botón Refrescar).

## 4. UI redesign — `src/pages/EnvioAlertas.tsx`

Scrap completo del form + lista mock. Nueva estructura:

```
Header
  - Título "Alertas Enviadas"
  - Subtítulo: "Respuestas capturadas desde los formularios de monitoreo TV y Radio"
  - Botón Refrescar (icon RefreshCw)

Filtros
  - Tabs: Todos / TV / Radio   (shadcn Tabs)
  - Input búsqueda (debounced 300ms) — filtra título/resumen/programa
  - DateRange opcional (reuse DateRangeFilter) → mapea a `since`

Grid de cards
  - Responsive: 1 col mobile, 2 md, 3 lg
  - Skeletons mientras carga
  - Empty-state con icono Bell si no hay resultados
  - Paginación: botón "Cargar más" (page_size siguiente)
```

## 5. Card component

`src/components/alertas/AlertResponseCard.tsx` (nuevo, inspirado en `ClientSpotlightCard`)

Layout:
- Header con badge del tipo (TV / Radio) + fecha relativa (`formatDistanceToNow`, locale es).
- Línea canal + programa (icono Tv/Radio).
- Título de la noticia (font-semibold, line-clamp-2).
- Resumen (text-sm, line-clamp-4, hover → expand via Dialog).
- Footer:
  - Badge de Categoría (variant según mapping).
  - Chips outline para `clients` (truncar a 3 + "+N").
  - Tags como pills sutiles.
- Click abre `AlertResponseDialog` con resumen completo + todos los answers.

Tokens semánticos (`bg-card`, `text-foreground`, `border`, `text-muted-foreground`) — sin colores hardcoded.

## 6. Routing & enlaces

- La ruta `/envio-alertas` se mantiene (label sidebar ya es "Alertas Enviadas").
- Sin cambios en otros consumidores: el spotlight de clientes y AI analysis no tocan este endpoint.

## Detalles técnicos

- **Mapeo de campos**: hacer en el edge function usando el `title` del field (case-insensitive contains: "título", "resumen", "categoría", "canal", "programa", "lista de email", "tags"). Soporta cambios de orden sin tocar código.
- **Choice fields** (Canal, Programa, Categoría, Lista de Emails): leer `answer.choice.label` o `answer.choices.labels[]`.
- **Rate limit Typeform**: 2 req/s por token → cache 5 min + dedupe por form.
- **Seguridad**: edge function valida JWT, nunca expone el token; `verify_jwt = true` (default).
- **Errores**: si Typeform devuelve 401, edge function devuelve 503 con `{ error: 'typeform_auth' }` → UI muestra alert pidiendo revisar token.

## Archivos

Nuevos:
- `supabase/functions/get-typeform-alerts/index.ts`
- `src/hooks/use-typeform-alerts.ts`
- `src/components/alertas/AlertResponseCard.tsx`
- `src/components/alertas/AlertResponseDialog.tsx`
- `src/components/alertas/AlertasFilters.tsx`

Modificados:
- `src/pages/EnvioAlertas.tsx` (rewrite)

Secret requerido:
- `TYPEFORM_API_TOKEN` (pedir tras aprobar plan).

## Preguntas abiertas (puedes responder en chat al aprobar)

1. ¿Confirmas el TV Form ID? (no aparece en el código actual, solo el de Radio).
2. ¿Quieres persistir las respuestas en una tabla Supabase vía webhook más adelante, o de momento solo lectura on-demand desde Typeform? (Plan actual = on-demand + cache 5min).
