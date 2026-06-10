/**
 * Shared canonical TV analysis prompt.
 *
 * IMPORTANT: All TV analysis paths (process-tv-with-qwen, analyze-tv-stored,
 * analyze-tv-content/Gemini fallback, retry buttons) MUST use THIS prompt to
 * preserve the two-level color-coded output the UI expects:
 *
 *   [TIPO DE CONTENIDO: PROGRAMA REGULAR]   ← blue card in TvFormattedAnalysisResult
 *     [NOTICIA 1]
 *     Título: ...
 *     Resumen: ...
 *     Participantes: ...
 *     Temas: ...
 *     Tono: ...
 *     Categorías: ...
 *     5W (QUIÉN/QUÉ/CUÁNDO/DÓNDE/POR QUÉ): ...
 *     Palabras clave: ...
 *     Puntuación de impacto: N/10
 *     [NOTICIA 2] ...
 *
 *   [TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]  ← yellow card
 *     Marca/producto, mensaje clave, llamada a la acción, tono, duración
 *
 * Do NOT strip the [TIPO DE CONTENIDO: ...] markers or the per-story
 * [NOTICIA N] segmentation — they drive the colored card UI and the
 * structured-field extractor.
 */
export function buildTvAnalysisPrompt(
  categories: string[],
  clients: { name: string; keywords?: string[] }[],
  transcriptionText: string,
  contextText: string = '',
): string {
  const categoriesText = categories.length > 0
    ? categories.join(', ')
    : 'ENTRETENIMIENTO, EDUCACION & CULTURA, COMUNIDAD, SALUD, CRIMEN, TRIBUNALES, AMBIENTE & EL TIEMPO, ECONOMIA & NEGOCIOS, GOBIERNO, POLITICA, EE.UU. & INTERNACIONALES, DEPORTES, RELIGION, OTRAS, ACCIDENTES, CIENCIA & TECNOLOGIA';

  const clientsText = clients.length > 0 ? clients.map(c => c.name).join(', ') : '';
  const clientKeywordMap = clients.length > 0
    ? clients.map(c => {
        const kws = (c.keywords && c.keywords.length > 0) ? c.keywords.join(', ') : '—';
        return `- ${c.name}: ${kws}`;
      }).join('\n')
    : '';

  let prompt = `Eres un analista experto en contenido de televisión de Puerto Rico y el Caribe. Tu tarea es analizar la siguiente transcripción de un programa de TV en español e identificar y separar el contenido publicitario del contenido regular del programa.

IMPORTANTE - FORMATO DE RESPUESTA:
Debes identificar y separar claramente cada sección de contenido, comenzando CADA SECCIÓN con uno de estos encabezados EXACTOS (entre corchetes, en mayúsculas):

[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]
o
[TIPO DE CONTENIDO: PROGRAMA REGULAR]

IDENTIFICACIÓN DE ANUNCIOS EN TV:
Señales clave para identificar anuncios:
- Menciones de precios, ofertas o descuentos
- Llamadas a la acción ("llame ahora", "visite nuestra tienda", "disponible en", etc.)
- Información de contacto (números de teléfono, direcciones, sitios web)
- Menciones repetidas de marcas o productos específicos
- Lenguaje persuasivo o promocional
- Cambios abruptos de tema (cortes comerciales)
- Jingles, eslóganes o frases promocionales repetitivas

PARA CADA SECCIÓN DE ANUNCIO PUBLICITARIO incluye:
1. Marca(s) o producto(s) anunciados
2. Mensajes clave del anuncio
3. Llamada a la acción (si existe)
4. Tono del anuncio
5. Duración aproximada

IDENTIFICACIÓN DE NOTICIAS INDIVIDUALES (CRÍTICO):
Dentro de cada sección [TIPO DE CONTENIDO: PROGRAMA REGULAR], identifica CADA NOTICIA INDIVIDUAL. Un noticiero típico contiene 8-15 noticias separadas por transiciones (cambios de escena, gráficos, voz del presentador volviendo a estudio).

Para CADA NOTICIA INDIVIDUAL, crea un bloque separado usando EXACTAMENTE este formato (mantén las etiquetas literales):

[NOTICIA 1]
Título: [Título conciso de la noticia, máx. 15 palabras]
Resumen: [10-15 oraciones con los puntos clave]
Participantes: [Nombres de hablantes en esta noticia específica, separados por coma]
Temas: [Temas principales tratados en ESTA noticia]
Tono: [Estilo de presentación: informativo / editorial / debate / entrevista / reportaje]
Categorías: [Categoría principal y secundarias de la lista: ${categoriesText}]
5W:
  - QUIÉN: [Personas, organizaciones, instituciones — nombres completos y cargos]
  - QUÉ: [Eventos, acciones, decisiones principales]
  - CUÁNDO: [Fechas, tiempos, cronología]
  - DÓNDE: [Lugares, municipios, barrios, países]
  - POR QUÉ: [Causas, motivos, razones identificadas]
Palabras clave: [10-15 palabras o frases más relevantes, separadas por coma]
Puntuación de impacto: [N/10 con breve justificación]

[NOTICIA 2]
Título: ...
(repite el mismo formato)

[NOTICIA N]...

REGLAS DE ANTI-MEZCLA:
- NO mezcles dos noticias diferentes en el mismo bloque [NOTICIA N].
- NO inventes noticias que no estén en la transcripción.
- Si una "noticia" es muy breve (<3 oraciones), aún así dale su propio bloque.

REGLAS ANTI-ALUCINACIÓN DE NOMBRES (CRÍTICO — INCUMPLIR INVALIDA EL ANÁLISIS):
- NO inventes, asumas ni completes nombres de personas, cargos, instituciones, municipios o entidades que NO aparezcan EXPLÍCITAMENTE en la transcripción o en los gráficos en pantalla (lower thirds/chyrons) leídos por el modelo.
- Si la transcripción dice "el alcalde", "la senadora", "el secretario" SIN dar el nombre, escribe literalmente "alcalde (nombre no mencionado)" / "senadora (nombre no mencionado)". NO añadas un nombre real conocido.
- Si no estás 100% seguro de la grafía exacta de un nombre escuchado, escríbelo tal como suena y añade "(según audio)" en lugar de "corregirlo" a una persona pública conocida.
- En "Participantes", "QUIÉN" y "PRESENCIA DE PERSONAS O ENTIDADES RELEVANTES" SOLO lista personas/entidades cuyo nombre aparece textualmente en la transcripción o en los chyrons. NO incluyas figuras políticas, funcionarios o celebridades por "contexto" si no fueron nombradas.
- NO uses tu conocimiento previo sobre Puerto Rico para rellenar nombres faltantes (ej. no asumas el actual gobernador, alcalde de San Juan, secretarios de agencias, etc.).
- Atribuye citas SOLO al hablante identificado por su SPEAKER o chyron. Si no se puede determinar quién lo dijo, escribe "(hablante no identificado)".

NOTA SOBRE CITAS: Usa citas textuales BREVES (máx. 1-2 oraciones) SOLO donde se requieran explícitamente (sección de Relevancia para Clientes). En el resumen y análisis general, parafrasea en tus propias palabras — NO copies párrafos completos de la transcripción.

Después de listar todas las noticias del programa regular, añade:

ALERTAS Y RECOMENDACIONES: Situaciones de alto impacto o urgencia que requieran atención inmediata (de cualquier noticia del programa).

PRESENCIA DE PERSONAS O ENTIDADES RELEVANTES: Lista global de personas/entidades de alto perfil mencionadas en todo el programa.`;

  if (clientsText && clientKeywordMap) {
    prompt += `

RELEVANCIA PARA CLIENTES: Evalúa el contenido contra la siguiente lista de clientes. SOLO incluye los clientes para los cuales el contenido ES relevante (nivel ALTA o MEDIA). NO listes clientes que no tienen relevancia.

Criterios de relevancia (incluir si cumple AL MENOS uno):
- Mención directa del cliente, sus productos o servicios
- Mención de competidores directos del cliente en su industria
- Noticias del sector o industria del cliente que podrían afectarlo
- Regulaciones, legislación o políticas públicas que impacten al cliente
- Tendencias del mercado relevantes para el negocio del cliente
- Coincidencia con las palabras clave asignadas al cliente

Lista de clientes y sus palabras clave:
${clientKeywordMap}

Para cada cliente RELEVANTE indica:
- Nombre del cliente
- Nivel de relevancia: ALTA / MEDIA
- Razón de relevancia (mención directa, competidor, industria, regulación, etc.)
- Palabras clave o menciones encontradas
- Citas textuales BREVES (1-2 oraciones máx.) que justifiquen la relevancia`;
  } else if (clientsText) {
    prompt += `

RELEVANCIA PARA CLIENTES: Evalúa el contenido contra: ${clientsText}. SOLO clientes con relevancia ALTA o MEDIA. Para cada uno: nombre, nivel, razón, citas BREVES.`;
  }

  prompt += `

REGLAS DE SALIDA:
1. Comenzar SIEMPRE con el encabezado [TIPO DE CONTENIDO: ...] correspondiente.
2. Si es PROGRAMA REGULAR, mantener la segmentación por [NOTICIA N] con TODOS los campos listados.
3. Si es ANUNCIO PUBLICITARIO, enfatizar marcas, productos y CTA.
4. Utilizar los nombres específicos de los hablantes (con su rol entre paréntesis si está disponible) en lugar de "SPEAKER A".
5. Responder en español puertorriqueño profesional.`;

  if (contextText) {
    prompt += `\n\nContexto adicional: ${contextText}`;
  }

  prompt += `

═══════════════════════════════════════════════════════════════
TRANSCRIPCIÓN A ANALIZAR:
═══════════════════════════════════════════════════════════════

${transcriptionText}`;

  return prompt;
}