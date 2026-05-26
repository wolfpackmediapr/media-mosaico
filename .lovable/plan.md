## Plan

1. **Corregir `TagsInput` para que no pierda el texto escrito**
   - Cambiar el guardado de tags para que use el valor real del input en el momento de presionar `Enter` o `,`, en vez de depender solo del estado `draft` de React.
   - Esto evita la condición donde el usuario escribe una palabra y al presionar Enter/coma el campo se limpia pero el tag no se agrega.

2. **Mantener soporte para múltiples tags pegados o separados por coma**
   - Si el usuario escribe o pega `tag1, tag2`, se deben crear ambos tags.
   - Se seguirán evitando duplicados sin importar mayúsculas/minúsculas.

3. **Asegurar que Guardar cambios incluya cualquier tag pendiente**
   - El submit del formulario seguirá forzando el commit de cualquier texto que quede sin convertir a tag.
   - Ajustaré el commit para que también lea directamente desde el input como respaldo.

4. **Verificación**
   - Revisar que el flujo esperado sea: escribir tag → presionar Enter o coma → aparece como chip → Guardar cambios → se envía en `keywords`.
   - Confirmar que eliminar tags y pegar listas separadas por coma sigan funcionando.