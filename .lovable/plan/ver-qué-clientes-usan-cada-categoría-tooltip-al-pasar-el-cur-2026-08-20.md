# Ver qué clientes usan cada categoría (tooltip al pasar el cursor)

## Objetivo
En Ajustes > Clientes > Taxonomía de Clientes, al colocar el cursor sobre la burbuja "N cliente(s)" (tanto en categorías como en subcategorías), mostrar la lista de nombres de los clientes asignados.

## Comportamiento
- Hover (o tap en móvil) sobre la burbuja abre un panel pequeño con los nombres, en orden alfabético.
- Si hay muchos, se muestran los primeros 15 y una línea "+N más".
- Si el conteo es 0, la burbuja se queda como está (sin panel).
- Contenido con scroll si la lista es larga; no cambia el diseño actual de la página.

## Detalles técnicos
- `src/services/clients/clientCategoriesService.ts`: extender `fetchClientCategoryUsage` para devolver también los nombres, no solo los conteos:
  - `clients` -> seleccionar `id, name, client_category_id` (en vez de solo el id de categoría) y construir `namesByCategory: Record<string, string[]>`.
  - `client_subcategory_assignments` -> unir con los nombres de clientes (`select("client_id, client_subcategory_id, clients(name)")`) para construir `namesBySubcategory`.
  - Mantener las claves existentes `byCategory` / `bySubcategory` para no romper consumidores.
- `src/pages/configuracion/clientCategories/ClientCategoriesSettings.tsx`: envolver ambas burbujas `Badge ... cliente(s)` en el componente existente `HoverCard` de shadcn (con `Tooltip` como alternativa si se prefiere ligereza), usando los nombres del query de uso. Añadir `cursor-help` a la burbuja cuando hay clientes.
- Sin cambios de base de datos ni de RLS; se reutiliza el mismo query ya cacheado (`client-categories-usage`).
