# Mostrar destinatarios ("Lista de Emails") en Alertas Enviadas

## Resultado de la auditoría

Los datos ya están completos en el espejo local de Typeform:

- 49,672 respuestas guardadas (33,541 radio / 16,131 TV). Sólo 4 en total no tienen destinatarios.
- El campo del formulario se llama exactamente **"Lista de Emails"** en ambos formularios (TV y Radio) y ya se guarda tanto en `raw_answers` como en la columna normalizada `clients`. Coinciden 1:1 en las respuestas revisadas.
- Últimos 30 días: 8,155 etiquetas de destinatario, 28 destinatarios distintos.

El problema no es de datos: es de presentación.

1. La función que sirve las alertas **descarta** cualquier destinatario que no coincida exactamente con un cliente activo en Ajustes > Clientes. Eso oculta destinatarios reales como NF Energía, Pavia, HOLICOM, Seguros Múltiples, Ecoelectrica, Cruz Roja, ABBVIE, Liberty y otros (aprox. 1,190 etiquetas en los últimos 30 días quedan invisibles).
2. La tarjeta sólo muestra 3 destinatarios y los mezcla visualmente con la categoría, sin indicar que son los destinatarios del envío.

## Cambios propuestos

**1. Dejar de ocultar destinatarios (edge function `get-typeform-alerts`)**
- Devolver siempre la lista completa tal como llegó de Typeform.
- Añadir junto a cada alerta la marca de cuáles destinatarios corresponden a un cliente activo, para poder distinguirlos visualmente sin esconder ninguno.

**2. Tarjeta de alerta (`AlertResponseCard`)**
- Sección propia con la etiqueta "Enviada a:", separada de la categoría.
- Mostrar hasta 4 destinatarios; el resto en un contador "+N" con tooltip que lista los nombres completos.
- Destinatarios que no son clientes activos se muestran en estilo apagado (no se ocultan).
- Si no hay destinatarios, mostrar "Sin destinatarios registrados".

**3. Detalle de la alerta (`AlertResponseDialog`)**
- Renombrar la sección "Clientes" a "Enviada a (Lista de Emails)" y listar todos los destinatarios sin truncar.

## Detalles técnicos

- Archivos: `supabase/functions/get-typeform-alerts/index.ts`, `src/hooks/use-typeform-alerts.ts` (añadir `activeClients: string[]` al tipo de alerta), `src/components/alertas/AlertResponseCard.tsx`, `src/components/alertas/AlertResponseDialog.tsx`.
- Sin cambios de esquema, RLS, autenticación ni de la sincronización con Typeform.
- El emparejamiento con clientes activos se conserva sólo como señal visual, no como filtro de datos.