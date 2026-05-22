## Objetivo
Reducir falsos positivos y falsos negativos en "Menciones de Clientes" del dashboard.

## Cambios

### 1. `src/services/social/clientMatcher.ts` — matcher más estricto
- Reemplazar `haystack.includes(term)` por regex con **límites de palabra** (`\bterm\b`) sobre texto normalizado, para evitar que `"ana"` matchee `"banana"`.
- Escapar caracteres especiales del término antes de armar el regex.
- Subir `MIN_KEYWORD_LEN` de **3 → 4** (los nombres del cliente siguen exentos de este mínimo: siempre se buscan completos).
- Ampliar el haystack para incluir también `summary` y `keywords` del artículo, no solo `title + description`.
- Mantener el match por JSONB (`article.clients`) como hoy, pero normalizar también comparaciones por nombre con tolerancia a prefijos comunes ("Hon.", "Lcdo.", "Sen.", "Rep.") removiéndolos antes de comparar.

### 2. `src/hooks/use-client-spotlight.ts` — incluir campos nuevos
- Añadir `summary` al `select` de `news_articles` para que el matcher pueda usarlo.
- Bump del `queryKey` a `v3` para invalidar caché previo.

### 3. Activar scope desde la UI (opcional, recomendado)
- `src/components/social/ClientSpotlightSection.tsx`: añadir tabs **Todos / Prensa / Social** que cambien el `scope` pasado al hook. Hoy el hook lo soporta pero el dashboard siempre usa `"all"`.

## Sin cambios de backend
No requiere migraciones ni edge functions. Todo es lógica cliente.

## Verificación
- Revisar en el preview que clientes con nombres cortos/genéricos ya no aparezcan inflados.
- Confirmar que clientes con keywords largos (3 letras antes excluidos por ruido, ahora 4) siguen apareciendo cuando corresponde.
- Probar las tabs Todos/Prensa/Social y validar que el conteo cambia coherentemente.
