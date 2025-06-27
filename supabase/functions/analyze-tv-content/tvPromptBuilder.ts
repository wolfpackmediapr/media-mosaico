
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

Tu tarea es analizar ${hasTranscription ? 'la transcripción de un programa de TV' : 'el contenido visual de un video de TV'} y proporcionar un análisis estructurado en formato JSON.

${categoriesText}
${clientsText}

Genera un análisis completo que incluya:

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

Responde ÚNICAMENTE en formato JSON con esta estructura:
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

${contextText ? `Contexto adicional: ${contextText}` : ''}
`;
}
