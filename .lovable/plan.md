# Arreglar el hover que no muestra los clientes

## Qué está pasando
La burbuja "N cliente(s)" no responde al pasar el cursor porque el componente `Badge` no reenvía la referencia que necesita el panel flotante (la consola muestra: "Function components cannot be given refs... Check the render method of SlotClone" apuntando a `Badge`). Sin esa referencia, el panel nunca se ancla ni se abre.

## Solución
- En `src/pages/configuracion/clientCategories/ClientCategoriesSettings.tsx`, dentro de `ClientUsageBadge`: usar como disparador un `<span tabIndex={0}>` que envuelva al `Badge` (el `span` sí acepta la referencia), en vez de pasar `asChild` directamente al `Badge`.
- Mantener `cursor-help`, el `stopPropagation` del clic (para no abrir/cerrar el acordeón) y añadir apertura por teclado/foco para accesibilidad.
- Añadir `onPointerDown` con `stopPropagation` para que en móvil el toque muestre la lista sin activar el acordeón.

## Verificación
Abrir Ajustes > Clientes > Taxonomía de Clientes y confirmar en el navegador que al pasar el cursor sobre una burbuja con clientes (p. ej. "Gobierno — 4 cliente(s)") aparece la lista de nombres, y que la consola ya no muestra la advertencia de refs.
