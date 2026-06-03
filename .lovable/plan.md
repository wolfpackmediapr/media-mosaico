## Objetivo

En el pop-up "Ver todas" de **Menciones de Clientes** (`ClientSpotlightDialog`), bajo cada noticia mostrar una o varias **bubbles (badges)** con el/los keywords exactos que dispararon el match para ese post. Si matcheó por nombre del cliente, mostrar también ese nombre como bubble. Si matcheó por el JSON `clients` de la IA, mostrar una bubble "IA".

Adicionalmente, auditoría de los filtros actuales con mejoras propuestas (sin implementar).

---

## 1) Cambios para mostrar las bubbles por post

### a. Tipos — `src/types/social.ts`

```ts
export type MatchedTermType = "name" | "keyword" | "ai";
export interface MatchedTerm {
  label: string;            // texto a mostrar en la bubble (keyword o nombre original)
  type: MatchedTermType;
}
export interface SpotlightArticle extends SocialPost {
  matchedTerms: MatchedTerm[];
}
export interface ClientSpotlight {
  clientId: string;
  clientName: string;
  category: string;
  matchCount: number;
  articles: SpotlightArticle[];      // antes SocialPost[]
  allArticles: SpotlightArticle[];
}
```

### b. Matcher — `src/services/social/clientMatcher.ts`

Por cada artículo que matchea con un cliente, calcular `matchedTerms`:

- Reusar el `haystack` y `buildTermRegex` ya existentes.
- Recorrer `[client.name, ...client.keywords]` y probar cada uno; si pasa, agregar `{ label: <texto original sin honoríficos>, type: "name" | "keyword" }`.
- Si hubo `jsonMatch` (campo `article.clients` de la IA) y ningún término textual matcheó, agregar `{ label: client.name, type: "ai" }` para que el post siempre muestre al menos una bubble.
- Deduplicar por `label` (case-insensitive).
- Devolver `SpotlightArticle = { ...transform(article), matchedTerms }`.

No se modifica la lógica de inclusión, solo se acumula info para la UI.

### c. Diálogo — `src/components/social/ClientSpotlightDialog.tsx`

Bajo el bloque de fuente/fecha de cada `<li>`, agregar una fila de bubbles:

```tsx
{a.matchedTerms.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1.5">
    {a.matchedTerms.slice(0, 8).map((t) => (
      <Badge
        key={t.label}
        variant={t.type === "name" ? "default" : t.type === "ai" ? "outline" : "secondary"}
        className="text-[10px] px-1.5 py-0 h-5"
      >
        {t.type === "ai" ? "✨ " : ""}{t.label}
      </Badge>
    ))}
    {a.matchedTerms.length > 8 && (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
        +{a.matchedTerms.length - 8}
      </Badge>
    )}
  </div>
)}
```

Estilo: bubbles pequeñas para no romper el layout actual, colores ya definidos por los variants del design system.

---

## 2) Auditoría de filtros del Spotlight (read-only)

Estado actual (`use-client-spotlight.ts` + `clientMatcher.ts`):

| Filtro | Estado | Observación |
|---|---|---|
| Ventana 30 días (`pub_date >= now-30d`) | ✅ | Correcto |
| Scope Todos/Prensa/Social vía `feed_sources.platform` | ⚠️ | "news" = cualquier feed que **no** sea social, incluye `platform = null` (puede colar feeds mal clasificados) |
| `is_active = true` en `clients` | ✅ | Correcto |
| `limit(1000)` artículos | ⚠️ | Techo duro; en 30 días el feed puede exceder 1000 y dejar clientes sin menciones |
| Match por JSON `article.clients` | ✅ | Funciona; pero si el mismo artículo aparece en varios feeds, cuenta múltiple |
| Match por nombre completo (sin min length) | ✅ | Strip de honoríficos correcto |
| Match por keywords `>= 4` chars | ⚠️ | Excluye acrónimos importantes: `AAA`, `LUMA`, `UPR`, `PRI`, `DDEC`, `JGo` |
| Word-boundary + sin acentos + sin honoríficos | ✅ | Robusto |
| Ordenamiento por `matchCount` desc | ✅ | Falta tie-breaker por fecha del artículo más reciente |
| Realtime | ⚠️ | Solo escucha cambios en `clients`, no en `news_articles` |
| Dedupe entre fuentes (mismo `link`) | ❌ | No se hace en el spotlight, sí en ingestor de Prensa Digital |

### Mejoras recomendadas (no se implementan en este plan)

1. **Bajar el mínimo a 3 caracteres para acrónimos** (heurística: keyword toda en MAYÚSCULAS o con dígitos/puntuación). Impacto alto, captura `AAA`, `LUMA`, `UPR`, `JGo`, `DDEC`.
2. **Dedupe por `link` normalizado** antes de matchear, evita doble conteo en clientes con presencia en RSS + Web.
3. **Paginación en bloques** de 1000 hasta agotar la ventana de 30 días, o mover el matching al backend con una RPC/edge function.
4. **Endurecer scope "news"**: requerir `platform NOT NULL` y/o lista explícita de plataformas de prensa.
5. **Tie-breaker por recencia** cuando hay empate de `matchCount`.
6. **Filtro de plataforma dentro del diálogo** (Tabs Prensa/Social) para listas largas.
7. **Realtime opcional sobre `news_articles`** con throttle 60s.
8. **`MIN_KEYWORD_LEN` configurable** por cliente (columna nueva `match_min_length`) para casos especiales.

Confirmar si se quiere abordar alguna de estas en plan aparte; las de mayor ROI son **#1, #2 y #4**.

---

## Archivos a modificar (solo bubbles)

- `src/types/social.ts`
- `src/services/social/clientMatcher.ts`
- `src/components/social/ClientSpotlightDialog.tsx`

No se toca: card resumen, matching, filtros, hook, ni el resto de la UI.
