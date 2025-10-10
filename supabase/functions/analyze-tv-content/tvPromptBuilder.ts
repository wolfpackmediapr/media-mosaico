
export function constructTvPrompt(
  categories: string[],
  clients: any[],
  contextText: string = '',
  hasTranscription: boolean = true
): string {
  const categoriesText = categories.length > 0 
    ? `Categorías disponibles: ${categories.join(', ')}`
    : 'Sin categorías específicas';

  const clientsText = clients.length > 0
    ? `Clientes relevantes: ${clients.map(c => `${c.name} (keywords: ${c.keywords?.join(', ') || 'ninguna'})`).join('; ')}`
    : 'Sin clientes específicos';

  return `
Eres un experto analista de contenido de televisión especializado en noticias de Puerto Rico y el Caribe.

Tu tarea es analizar ${hasTranscription ? 'la transcripción de un programa de TV' : 'el contenido visual de un video de TV'} y proporcionar PRIMERO la transcripción con separación de hablantes, y LUEGO un análisis estructurado en formato JSON.

${categoriesText}
${clientsText}

PARTE 1 - TRANSCRIPCIÓN CON HABLANTES:
Primero, proporciona la transcripción completa en el siguiente formato:

SPEAKER 1: [nombre si está disponible]: [texto completo de lo que dice]
SPEAKER 2: [nombre si está disponible]: [texto completo de lo que dice]
...

IDENTIFICACIÓN VISUAL DE HABLANTES:
- USA TU CAPACIDAD DE VISIÓN para identificar a los hablantes
- LEE los "lower thirds" (subtítulos con nombres en pantalla)
- LEE las tarjetas gráficas y chyrons con información de personas
- IDENTIFICA logos de TV, canales y elementos visuales
- RECONOCE personalidades de noticias de Puerto Rico y el Caribe
- DISTINGUE roles: Presentador/Anchor, Reportero, Invitado, Analista, Voz en off
- FORMATO PREFERIDO: SPEAKER 1 (Nombre Completo - Rol):
- Si no puedes identificar visualmente, usa: SPEAKER X:

REGLAS DE FORMATO:
- Utiliza "SPEAKER X:" para identificar cada hablante
- Si conoces el nombre y rol del hablante, inclúyelo: SPEAKER 1 (José Rivera - Reportero):
- Mantén el orden cronológico de las intervenciones
- Incluye TODO el diálogo, no solo fragmentos
- Cada línea debe comenzar con "SPEAKER X:"

PARTE 2 - ANÁLISIS ESTRUCTURADO:
Después de la transcripción, proporciona un análisis en formato JSON:

{
  "categoria": "categoría principal del contenido",
  "relevancia_clientes": [
    {
      "cliente": "nombre del cliente",
      "nivel_relevancia": "alto/medio/bajo",
      "razon": "explicación de por qué es relevante"
    }
  ],
  "analisis_5w": {
    "quien": "personas y organizaciones mencionadas",
    "que": "eventos y acciones principales",
    "cuando": "información temporal relevante",
    "donde": "ubicaciones y lugares mencionados",
    "porque": "causas y motivos identificados"
  },
  "palabras_clave": ["palabra1", "palabra2", "palabra3"],
  "resumen": "resumen ejecutivo del contenido",
  "alertas": [
    "alerta específica para cliente 1",
    "alerta específica para cliente 2"
  ],
  "puntuacion_impacto": "1-10 según el impacto noticioso",
  "recomendaciones": ["recomendación 1", "recomendación 2"]
}

El análisis debe incluir:
1. **Clasificación del contenido** según las categorías disponibles
2. **Análisis de relevancia** para los clientes mencionados
3. **Extracción de información clave** siguiendo el método periodístico de las 5W:
   - Quién (personas, organizaciones mencionadas)
   - Qué (eventos, acciones, decisiones)
   - Cuándo (fechas, tiempos, cronología)
   - Dónde (lugares, ubicaciones)
   - Por qué (causas, motivos, razones)
4. **Palabras clave y temas principales**
5. **Resumen ejecutivo**
6. **Alertas de relevancia** para clientes específicos

${contextText ? `Contexto adicional: ${contextText}` : ''}
`;
}
