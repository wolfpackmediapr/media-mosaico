# Filtrar clientes NO RELEVANTES en Análisis TV (Programa Regular)

## Respuestas a tus preguntas

**1. ¿De dónde salen los clientes?**
Sí — el edge function `process-tv-with-gemini` los lee directamente de la tabla `clients` (la misma que ves en **Ajustes → Clientes**):

```ts
supabase.from('clients').select('*').order('name')
```

Se inyectan al prompt como `nombre + keywords` de cada cliente. Eso confirma que los nombres en la captura (PROMESA, Coop de Seguros, Cruz Roja, Naguabo, Amgen/Merck, Telemundo, Serrallés…) son los registros reales de tu tabla.

**2. ¿Por qué aparecen los NO RELEVANTES?**
Hay **tres prompts distintos** para TV en el repo y solo uno tiene la regla "incluye solo ALTA/MEDIA":

| Archivo | ¿Filtra NO RELEVANTE? | ¿Se usa en TV "Analizar"? |
|---|---|---|
| `supabase/functions/_shared/tvAnalysisPrompt.ts` | ✅ Sí | ❌ Solo lo usa `analyze-tv-stored` |
| `supabase/functions/process-tv-with-gemini/index.ts` → `constructTvPrompt` (local) | ❌ No pide filtrar | ✅ **Sí — es el que produce tu resultado** |
| `supabase/functions/process-tv-with-gemini/index.ts` → `buildTvAnalysisPrompt` (local, segundo prompt) | ❌ No pide filtrar y además tiene un **mapeo de keywords hardcoded** (Accidentes/Comunidad/etc.) que **NO viene de Ajustes** | ✅ Se usa en rutas alternativas de Gemini |

Resultado: el modelo lista todos los clientes — relevantes y no relevantes — porque nada le dice lo contrario.

---

## Cambios propuestos (solo TV, sin tocar Prensa/Radio)

**Archivo único:** `supabase/functions/process-tv-with-gemini/index.ts`

### 1. `constructTvPrompt` (líneas ~66–160)
Añadir, justo después de la lista de clientes, el bloque de relevancia que ya existe en el prompt compartido:

```
RELEVANCIA PARA CLIENTES: Evalúa el contenido contra la lista anterior.
SOLO incluye en `relevancia_clientes` los clientes con nivel ALTA o MEDIA.
NO listes clientes NO RELEVANTES — omítelos por completo del array.
Criterios para considerar relevante: mención directa, competidor del sector,
regulación/política que lo afecte, tendencia de su industria, o coincidencia
con sus keywords asignadas.
```

Y en el ejemplo JSON cambiar la nota del array `relevancia_clientes` para dejar claro que puede estar vacío si nadie aplica.

### 2. `buildTvAnalysisPrompt` (líneas ~1467+)
- Reemplazar el `clientKeywordMapping` **hardcoded** por una construcción dinámica desde `clients[].keywords` (igual que hace el prompt compartido), para que respete lo que el usuario configura en **Ajustes → Clientes**.
- Añadir la misma regla "SOLO ALTA/MEDIA, omite NO RELEVANTE".

### 3. Parser de salida (`src/utils/tv/analysisParser.ts`)
Defensa en profundidad: si por cualquier razón el modelo sigue devolviendo un cliente con `nivel_relevancia` que normalice a `no relevante` / `bajo` / `ninguna`, filtrarlo antes de renderizar la sección "RELEVANCIA PARA CLIENTES". Esto cubre análisis viejos ya guardados en BD.

---

## Lo que NO se toca

- Prensa Escrita, Radio, Prensa Digital, Redes Sociales: sin cambios.
- Tabla `clients`, Ajustes → Clientes: sin cambios.
- UI de TV (cards, color coding, segmentación por NOTICIA): sin cambios.
- Lógica de transcripción, speaker ID, chunking, Qwen fallback: sin cambios.
- El prompt compartido `_shared/tvAnalysisPrompt.ts` ya está bien — no se toca.

## Verificación

1. Re-deploy `process-tv-with-gemini`.
2. Re-analizar un video TV existente; confirmar que la sección "RELEVANCIA PARA CLIENTES" solo muestra los ALTA/MEDIA.
3. Abrir un análisis viejo de BD → confirmar que el parser filtra los NO RELEVANTE en el render.
