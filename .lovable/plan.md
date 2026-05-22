# Add Typeform Alerts Section to Inicio

## Goal
Reusar el feed de respuestas Typeform (TV+Radio mezcladas) en el dashboard `Inicio`, con estilo similar a `ClientSpotlightSection`.

## Cambios

### 1. Nuevo componente `src/components/alertas/AlertasSpotlightSection.tsx`
- Wrapper compacto sobre `useTypeformAlerts({ form: 'all' })`.
- Header con título "Alertas TV & Radio", subtítulo "Últimas respuestas capturadas desde los formularios de monitoreo", botón Refrescar y link "Ver todas" → `/envio-alertas`.
- Grid responsive (1 / 2 / 3 cols) reutilizando `AlertResponseCard`.
- Muestra solo las primeras 6 respuestas; skeletons al cargar; empty state breve.
- Sin tabs ni búsqueda (esos viven en `/envio-alertas`).

### 2. `src/pages/Index.tsx`
- Importar y montar `<AlertasSpotlightSection />` justo debajo de `<ClientSpotlightSection />` (línea ~60), antes de `CombinedNewsFeedWidget`.

## Sin cambios
- Edge function, hook, cards y la página `/envio-alertas` se quedan igual — solo añadimos un consumidor adicional.
