# Arreglo: "Editar" no parece hacer nada en Clientes

## Causa probable
El formulario de edición se renderiza **encima de la tabla**. Cuando el usuario está en la página 2/scrolleado, al pulsar el ícono ✏️ el form se abre arriba (fuera de la vista) → parece que "no pasa nada". No hay error, simplemente no se ve.

## Solución
Mostrar el `ClientForm` dentro de un `Dialog` (modal) cuando se está **editando** un cliente existente. Para "Nuevo Cliente" se mantiene el comportamiento actual (inline arriba), o también puede usar el mismo diálogo para consistencia.

## Cambios

**`src/components/settings/clients/ClientsList.tsx`**
- Envolver `<ClientForm/>` en `<Dialog open={showForm} onOpenChange={...}>` con `DialogContent` (max-w-2xl, scrollable).
- Título dinámico: "Editar cliente" / "Nuevo cliente".
- Al cerrar el diálogo (X o ESC) invocar `onCancelForm`.
- Quitar el `key={editingClient?.id ?? 'new'}` del componente y dejarlo en el `DialogContent` para forzar remount al cambiar de cliente.
- Quitar el título duplicado dentro de `ClientForm` (ya lo provee el Dialog).

**`src/components/settings/clients/ClientForm.tsx`**
- Eliminar el `<h3>` interno (lo maneja `DialogHeader`).
- Mantener wrapper como `<form>` sin estilos de card (el Dialog ya da el contenedor).

## Verificación
- Click en Editar desde cualquier fila/página → se abre modal con datos pre-cargados.
- Editar tags + Guardar → persiste y cierra modal.
- Click en Nuevo Cliente → mismo modal en blanco.
- ESC / clic fuera / Cancelar → cierra sin guardar.
