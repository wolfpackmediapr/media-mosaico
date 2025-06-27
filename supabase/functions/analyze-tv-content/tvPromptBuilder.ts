
import { Client } from './types.ts';

export const constructTvPrompt = (
  categories: string[] = [],
  clients: Client[] = [],
  additionalContext: string = '',
  hasSpeakerLabels: boolean = false
): string => {
  // Format categories list for TV content
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

  let prompt = `Eres un analista experto en contenido de televisión. Tu tarea es analizar la siguiente transcripción de TV en español e identificar y separar el contenido publicitario del contenido regular del programa televisivo.

IMPORTANTE - FORMATO DE RESPUESTA:
Debes identificar y separar claramente cada sección de contenido, comenzando CADA SECCIÓN con uno de estos encabezados:

[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]
o
[TIPO DE CONTENIDO: PROGRAMA REGULAR]

IDENTIFICACIÓN DE ANUNCIOS EN TV:
Señales clave para identificar anuncios televisivos:
- Menciones de precios, ofertas o descuentos
- Llamadas a la acción ("llame ahora", "visite nuestra tienda", "disponible en...", etc.)
- Información de contacto (números de teléfono, direcciones, sitios web)
- Menciones repetidas de marcas o productos específicos
- Lenguaje persuasivo o promocional
- Transiciones abruptas entre segmentos del programa
- Menciones de patrocinadores ("este programa es presentado por...")
- Referencias a promociones especiales o eventos comerciales

PARA CADA SECCIÓN DE ANUNCIO PUBLICITARIO:
1. Marca(s) o producto(s) anunciados
2. Mensajes clave del anuncio
3. Llamada a la acción (si existe)
4. Tono del anuncio
5. Duración aproximada
6. Tipo de anuncio (spot comercial, patrocinio, producto placement, etc.)

PARA CADA SECCIÓN DE PROGRAMA REGULAR:
1. Resumen del contenido televisivo (70-100 oraciones)
   - Incluir desarrollo cronológico de los temas tratados
   - Destacar citas textuales relevantes de presentadores o invitados
   - Mencionar interacciones entre presentadores, reporteros o invitados
   - Identificación de los participantes (presentadores, reporteros, invitados, corresponsales)${hasSpeakerLabels ? ' [utilizar los nombres específicos cuando estén disponibles]' : ''}
   - Describir segmentos informativos, entrevistas, reportajes o secciones especiales
   - Identificar transiciones entre diferentes bloques del programa

2. Temas principales tratados en el programa
   - Listar temas por orden de importancia y tiempo de cobertura
   - Incluir subtemas y noticias secundarias
   - Señalar conexiones temáticas entre diferentes segmentos
   - Identificar noticias de última hora o breaking news
   
3. Formato y tono del contenido televisivo
   - Estilo de presentación (noticiero formal, programa magazine, talk show, etc.)
   - Tipo de lenguaje utilizado por presentadores
   - Enfoque del contenido (informativo, de opinión, entretenimiento, educativo)
   - Dinámica entre presentadores y/o invitados
   - Identificar segmentos en vivo vs. pregrabados (si es evidente)
   
4. Categorías aplicables de: ${categoriesText}
   - Justificar la selección de cada categoría basándose en el contenido televisivo
   - Indicar categoría principal y secundarias según el tiempo de cobertura
   
5. Presencia de personas, instituciones o entidades relevantes mencionadas
   - Funcionarios públicos, empresarios, expertos entrevistados
   - Organizaciones, empresas o instituciones mencionadas
   - Personalidades públicas o figuras relevantes citadas`;

  // Add clients section if available
  if (clientsText) {
    prompt += `
6. Clientes relevantes que podrían estar interesados en este contenido televisivo
   Lista de clientes disponibles: ${clientsText}
   - Analizar menciones directas o indirectas
   - Identificar oportunidades de publicity o cobertura relevante`;
  } else {
    prompt += `
6. Oportunidades de publicity o menciones comerciales relevantes identificadas`;
  }

  // Add keyword mapping if available
  if (clientKeywordMap) {
    prompt += `
7. Palabras clave mencionadas relevantes para los clientes televisivos
   Lista de correlación entre clientes y palabras clave:
${clientKeywordMap}

Responde en español de manera concisa y profesional para contenido televisivo. Asegúrate de:
1. Comenzar SIEMPRE con el encabezado de tipo de contenido correspondiente en mayúsculas
2. Si es un anuncio, enfatizar las marcas, productos, llamadas a la acción y tipo de publicidad televisiva
3. Si es contenido regular, mantener el formato de análisis detallado específico para TV
4. Incluir las palabras textuales que justifiquen las asociaciones con clientes o palabras clave
5. Considerar el contexto televisivo (noticieros, programas, horarios de transmisión)${hasSpeakerLabels ? '\n6. Utilizar los nombres específicos de presentadores, reporteros e invitados cuando estén disponibles' : ''}`;
  } else {
    prompt += `\n\nResponde en español de manera concisa y profesional para contenido televisivo, comenzando SIEMPRE con el encabezado del tipo de contenido identificado en mayúsculas.${hasSpeakerLabels ? ' Utiliza los nombres específicos de presentadores, reporteros e invitados cuando estén disponibles.' : ''}`;
  }

  // Add speaker-specific instructions if available
  if (hasSpeakerLabels) {
    prompt += `\n\nIMPORTANTE - MANEJO DE PARTICIPANTES EN TV:
La transcripción incluye nombres específicos de participantes (presentadores, reporteros, invitados, corresponsales). Utiliza estos nombres específicos en tu análisis para:
- Identificar roles específicos (conductor principal, co-conductor, reportero, invitado, etc.)
- Describir la dinámica televisiva entre participantes
- Mencionar contribuciones específicas de cada presentador o invitado
- Proporcionar un análisis más personalizado del programa televisivo
- Identificar segmentos conducidos por diferentes presentadores

Evita usar referencias genéricas como "presentador 1", "invitado A", etc., cuando tengas nombres específicos disponibles.`;
  }

  // Add any additional context provided
  if (additionalContext) {
    prompt += additionalContext;
  }

  return prompt;
};
