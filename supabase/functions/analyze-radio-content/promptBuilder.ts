
import { Client } from './types.ts';

export const constructDynamicPrompt = (
  categories: string[] = [],
  clients: Client[] = [],
  additionalContext: string = '',
  hasSpeakerLabels: boolean = false
): string => {
  // Format categories list
  const categoriesText = categories.length > 0 
    ? categories.join(', ')
    : 'ENTRETENIMIENTO, EDUCACION & CULTURA, COMUNIDAD, SALUD, CRIMEN, TRIBUNALES, AMBIENTE & EL TIEMPO, ECONOMIA & NEGOCIOS, GOBIERNO, POLITICA, EE.UU. & INTERNACIONALES, DEPORTES, RELIGION, OTRAS, ACCIDENTES, CIENCIA & TECNOLOGIA';

  // Format clients list
  const clientsText = clients.length > 0
    ? clients.map(c => c.name).join(', ')
    : '';

  // Build client-keyword mapping
  const clientKeywordMap = clients.length > 0
    ? clients.map(client => {
        const keywords = client.keywords?.length > 0
          ? client.keywords.join(', ')
          : '—';
        return `- ${client.name}: ${keywords}`;
      }).join('\n')
    : '';

  let prompt = `Eres un analista experto en contenido de radio. Tu tarea es analizar la siguiente transcripción de radio en español e identificar y separar el contenido publicitario del contenido regular del programa.

IMPORTANTE - FORMATO DE RESPUESTA:
Debes identificar y separar claramente cada sección de contenido, comenzando CADA SECCIÓN con uno de estos encabezados:

[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]
o
[TIPO DE CONTENIDO: PROGRAMA REGULAR]

IDENTIFICACIÓN DE ANUNCIOS:
Señales clave para identificar anuncios:
- Menciones de precios, ofertas o descuentos
- Llamadas a la acción ("llame ahora", "visite nuestra tienda", etc.)
- Información de contacto (números de teléfono, direcciones)
- Menciones repetidas de marcas o productos específicos
- Lenguaje persuasivo o promocional

PARA CADA SECCIÓN DE ANUNCIO PUBLICITARIO:
1. Marca(s) o producto(s) anunciados
2. Mensajes clave del anuncio
3. Llamada a la acción (si existe)
4. Tono del anuncio
5. Duración aproximada

PARA CADA SECCIÓN DE PROGRAMA REGULAR:
1. Resumen del contenido (70-100 oraciones)
   - Incluir desarrollo cronológico de los temas
   - Destacar citas textuales relevantes
   - Mencionar interacciones entre participantes si las hay
   - Identificación de los participantes en la conversación (cuántos hablantes participan y si se pueden identificar sus roles o nombres)${hasSpeakerLabels ? ' [utilizar los nombres específicos de los hablantes cuando estén disponibles]' : ' [si hay etiquetas de hablante]'}

2. Temas principales tratados
   - Listar temas por orden de importancia
   - Incluir subtemas relacionados
   - Señalar conexiones entre temas si existen
3. Tono del contenido
   - Estilo de la presentación (formal/informal)
   - Tipo de lenguaje utilizado
   - Enfoque del contenido (informativo/editorial/debate)
4. Categorías aplicables de: ${categoriesText}
   - Justificar la selección de cada categoría
   - Indicar categoría principal y secundarias`;

  // Add clients section if available
  if (clientsText) {
    prompt += `
5. Presencia de personas o entidades relevantes mencionadas
6. Clientes relevantes que podrían estar interesados en este contenido. Lista de clientes disponibles: ${clientsText}`;
  } else {
    prompt += `
5. Presencia de personas o entidades relevantes mencionadas`;
  }

  // Add keyword mapping if available
  if (clientKeywordMap) {
    prompt += `
7. Palabras clave mencionadas relevantes para los clientes. Lista de correlación entre clientes y palabras clave:
${clientKeywordMap}

Responde en español de manera concisa y profesional. Asegúrate de:
1. Comenzar SIEMPRE con el encabezado de tipo de contenido correspondiente en mayúsculas
2. Si es un anuncio, enfatizar las marcas, productos y llamadas a la acción
3. Si es contenido regular, mantener el formato de análisis detallado
4. Incluir las palabras textuales que justifiquen las asociaciones con clientes o palabras clave${hasSpeakerLabels ? '\n5. Utilizar los nombres específicos de los hablantes cuando estén disponibles en lugar de referencias genéricas como "SPEAKER A" o "SPEAKER B"' : ''}`;
  } else {
    prompt += `\n\nResponde en español de manera concisa y profesional, comenzando SIEMPRE con el encabezado del tipo de contenido identificado en mayúsculas.${hasSpeakerLabels ? ' Utiliza los nombres específicos de los hablantes cuando estén disponibles.' : ''}`;
  }

  // Add speaker-specific instructions if available
  if (hasSpeakerLabels) {
    prompt += `\n\nIMPORTANTE - MANEJO DE HABLANTES:
La transcripción incluye nombres específicos de hablantes (pueden ser nombres propios como "María", "Juan", etc., en lugar de etiquetas genéricas). Utiliza estos nombres específicos en tu análisis para:
- Identificar diferentes personas y sus roles
- Describir la dinámica de la conversación
- Mencionar contribuciones específicas de cada participante
- Proporcionar un análisis más personalizado y profesional

Evita usar referencias genéricas como "hablante 1", "participante A", etc., cuando tengas nombres específicos disponibles.`;
  }

  // Add any additional context provided
  if (additionalContext) {
    prompt += additionalContext;
  }

  return prompt;
}
