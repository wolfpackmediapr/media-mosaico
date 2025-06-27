
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

  let prompt = `Eres un analista experto en contenido de televisión puertorriqueña. Tu tarea es analizar la siguiente transcripción de TV en español e identificar y separar el contenido publicitario del contenido regular del programa televisivo.

CONTEXTO CULTURAL PUERTORRIQUEÑO:
Reconoce expresiones, modismos y referencias culturales específicas de Puerto Rico. Identifica menciones de:
- Lugares: municipios (San Juan, Bayamón, Ponce, etc.), barrios, puntos de referencia (El Yunque, Viejo San Juan, etc.)
- Personalidades: políticos locales (gobernadores, alcaldes, legisladores), artistas, figuras públicas
- Eventos: festivales (Festival de la Calle San Sebastián, Festival Casals), tradiciones, noticias locales
- Instituciones: UPR, gobierno municipal, Departamento de Educación, PRPA, etc.
- Referencias al estatus político: estadidad, independencia, ELA, relaciones con Estados Unidos

IMPORTANTE - FORMATO DE RESPUESTA JSON:
Debes responder ÚNICAMENTE en formato JSON válido con esta estructura exacta:

{
  "segments": [
    {
      "content_type": "ANUNCIO_PUBLICITARIO" | "PROGRAMA_REGULAR",
      "timestamp_start": "MM:SS",
      "timestamp_end": "MM:SS",
      "analysis": {
        // Contenido específico según el tipo
      },
      "speakers": [
        {
          "name": "nombre_real_identificado",
          "role": "presentador|reportero|invitado|corresponsal"
        }
      ],
      "keywords_detected": ["palabra1", "palabra2"],
      "client_relevance": [
        {
          "client": "nombre_cliente",
          "relevance_score": 0.8,
          "justification": "texto_justificativo_con_cita"
        }
      ]
    }
  ]
}

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
En el campo "analysis" incluir:
{
  "marcas_anunciadas": ["marca1", "marca2"],
  "mensajes_clave": ["mensaje1", "mensaje2"],
  "llamada_accion": "texto_de_llamada_a_accion",
  "tono_anuncio": "persuasivo|informativo|emocional|urgente",
  "duracion_aproximada": "MM:SS",
  "tipo_anuncio": "spot_comercial|patrocinio|producto_placement|infomercial",
  "target_demografico": "adultos|jovenes|familias|profesionales"
}

PARA CADA SECCIÓN DE PROGRAMA REGULAR:
En el campo "analysis" incluir:
{
  "resumen_detallado": "70-100 oraciones con desarrollo cronológico de los temas tratados",
  "citas_textuales": ["cita1", "cita2"],
  "interacciones_participantes": "descripción de la dinámica entre presentadores/invitados",
  "participantes_identificados": [
    {
      "nombre": "nombre_completo",
      "rol": "presentador_principal|co_presentador|reportero|invitado|corresponsal",
      "segmentos_participacion": ["segmento1", "segmento2"]
    }
  ],
  "segmentos_programa": [
    {
      "tipo": "noticia|entrevista|reportaje|seccion_especial|breaking_news",
      "titulo": "titulo_del_segmento",
      "timestamp": "MM:SS"
    }
  ],
  "temas_principales": [
    {
      "tema": "nombre_del_tema",
      "importancia": "alta|media|baja",
      "tiempo_cobertura": "MM:SS",
      "subtemas": ["subtema1", "subtema2"]
    }
  ],
  "formato_tono": {
    "estilo_presentacion": "noticiero_formal|magazine|talk_show|programa_opinion",
    "tipo_lenguaje": "formal|informal|conversacional|tecnico",
    "enfoque_contenido": "informativo|opinion|entretenimiento|educativo",
    "dinamica_presentadores": "colaborativa|jerarquica|debate|conversacional",
    "segmentos_vivo_vs_pregrabado": "identificacion_cuando_sea_evidente"
  },
  "categorias_aplicables": {
    "categoria_principal": "categoria_con_mayor_tiempo_cobertura",
    "categorias_secundarias": ["cat1", "cat2"],
    "justificaciones": {
      "categoria_principal": "justificacion_con_cita_textual",
      "categorias_secundarias": ["just1", "just2"]
    }
  },
  "entidades_mencionadas": {
    "funcionarios_publicos": ["nombre1", "nombre2"],
    "empresarios_expertos": ["nombre1", "nombre2"],  
    "organizaciones_instituciones": ["org1", "org2"],
    "personalidades_publicas": ["pers1", "pers2"]
  },
  "contenido_politico_especifico": {
    "referencias_estatus": ["estadidad", "independencia", "ELA"],
    "figuras_politicas_locales": ["figura1", "figura2"],
    "figuras_politicas_federales": ["figura1", "figura2"],
    "politicas_publicas_pr": ["politica1", "politica2"],
    "relaciones_eeuu": "descripcion_si_aplica"
  }
}`;

  // Add clients section if available
  if (clientsText) {
    prompt += `

ANÁLISIS DE RELEVANCIA PARA CLIENTES:
Lista de clientes disponibles: ${clientsText}
Para cada cliente relevante, incluir en client_relevance:
- Analizar menciones directas o indirectas en el contenido
- Calcular score de relevancia (0.0-1.0) basado en:
  * Mención directa del cliente: 0.8-1.0
  * Mención de industria/sector: 0.5-0.7  
  * Mención de competencia: 0.3-0.5
  * Contexto relacionado: 0.1-0.3
- Justificar con citas textuales exactas del contenido`;
  }

  // Add keyword mapping if available
  if (clientKeywordMap) {
    prompt += `

MAPEO DE PALABRAS CLAVE POR CLIENTE:
${clientKeywordMap}

INSTRUCCIONES PARA KEYWORDS:
- Identificar palabras clave exactas mencionadas en el contenido
- Incluir variantes y contextos relacionados
- Excluir menciones no relevantes (ej: "banco de sangre" para cliente bancario)
- Considerar peso contextual y relevancia demográfica`;
  }

  // Add speaker-specific instructions if available
  if (hasSpeakerLabels) {
    prompt += `

IMPORTANTE - IDENTIFICACIÓN PRECISA DE HABLANTES:
La transcripción incluye nombres específicos de participantes. Para cada speaker:
1. Determinar el nombre real basándose en:
   - Contexto de la conversación
   - Menciones directas en el diálogo
   - Referencias cruzadas entre participantes
2. Identificar roles específicos:
   - Conductor principal / Co-conductor
   - Reportero de campo / Corresponsal
   - Invitado experto / Entrevistado
   - Analista / Comentarista
3. NO usar referencias genéricas como "SPEAKER_01" cuando el nombre real sea identificable
4. Describir contribuciones específicas de cada participante al programa`;
  }

  prompt += `

TIMESTAMP REQUIREMENTS:
- Utilizar formato MM:SS para todos los timestamps
- Incluir timestamp_start y timestamp_end para cada segmento identificado
- Referenciar momentos específicos en justificaciones cuando sea relevante

CONTEXTO LINGUÍSTICO PUERTORRIQUEÑO:
- Reconocer dialectos y pronunciaciones específicas de Puerto Rico
- Identificar modismos locales y expresiones coloquiales
- Considerar código-switching entre español e inglés
- Entender referencias culturales y históricas locales`;

  // Add any additional context provided
  if (additionalContext) {
    prompt += `\n\nCONTEXTO ADICIONAL:\n${additionalContext}`;
  }

  prompt += `\n\nRECORDAR: Responder ÚNICAMENTE en formato JSON válido con la estructura especificada arriba.`;

  return prompt;
};
