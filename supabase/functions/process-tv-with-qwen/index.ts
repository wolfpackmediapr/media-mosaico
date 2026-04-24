
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const PRIMARY_MODEL = 'qwen3.5-omni-plus';
const FALLBACK_MODEL = 'qwen3.5-omni-flash';
const TEXT_MODEL = 'qwen-plus';        // For text-only analysis (Omni models require media input)
const VISION_MODEL = 'qwen-vl-max';   // For vision tasks (video/image understanding)
const TEXT_MODEL_FALLBACK = 'qwen-turbo'; // Fallback for text-only analysis
const MAX_RETRIES = 3;

const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2';

// ═══════════════════════════════════════════════════════════════════════
// SHARED: Speaker identification via Qwen TEXT model (text-only dialogue)
// Used by both chunked and single-file paths. Returns the (possibly enriched)
// transcription text plus status metadata to persist on tv_transcriptions.
// ═══════════════════════════════════════════════════════════════════════
async function identifySpeakersFromText(
  transcriptionText: string,
  qwenApiKey: string,
  requestId: string,
): Promise<{
  text: string;
  status: 'success' | 'failed' | 'skipped';
  method: string;
  error: string | null;
  identifiedCount: number;
}> {
  let status: 'success' | 'failed' | 'skipped' = 'skipped';
  const method = 'text-only';
  let error: string | null = null;
  let identifiedCount = 0;
  let outText = transcriptionText;

  try {
    if (!transcriptionText || transcriptionText.trim().length < 50) {
      return { text: outText, status: 'skipped', method, error: 'Transcription too short', identifiedCount };
    }

    console.log(`[qwen-tv][${requestId}] Identifying speakers from dialogue (text-only)...`);

    const speakerIdPrompt = `Analiza esta transcripción de noticias de Puerto Rico e identifica cada hablante (SPEAKER A, SPEAKER B, etc.) por NOMBRE y ROL usando SOLO pistas del diálogo.

PISTAS A BUSCAR:
1. AUTO-PRESENTACIONES: "Les saluda...", "Soy...", "Mi nombre es...", "Aquí [Nombre] reportando desde..."
2. MENCIONES POR OTROS: "pasamos con [Nombre]", "nuestra compañera [Nombre]", "Doctor [Apellido]", "Senador [Apellido]"
3. INDICADORES DE ROL: "reportera", "doctor", "presentador", "senador", "alcalde", "comentarista", "analista"
4. CONTEXTO CONVERSACIONAL:
   - Quien introduce segmentos / da la bienvenida = Presentador/Ancla
   - Quien reporta desde el lugar de los hechos = Reportero en campo
   - Quien responde preguntas / es entrevistado = Invitado/Entrevistado
   - Quien narra promociones de productos = Narrador de anuncio
5. PERSONALIDADES CONOCIDAS DE NOTICIAS DE PUERTO RICO (si los nombres mencionados coinciden):
   Silverio Pérez, Ada Monzón, Normando Valentín, Celimar Adames, Jorge Seijo,
   Aixa Vázquez, Rafael Lenín López, Keylla Hernández, Deborah Martorell,
   Wilson Carrasquillo, Jay Fonseca, Luis Penchi, Jorge Rivera Nieves.

REGLA CRÍTICA: Si NO puedes identificar un nombre concreto, usa un descriptor de rol en español:
- "Presentador principal" / "Mujer ancla" / "Hombre ancla"
- "Co-presentador/a"
- "Reportero/a en campo"
- "Invitado/a - Entrevistado/a"
- "Narrador de anuncio"
- "Voz en off"
- "Comentarista"
NUNCA devuelvas solo la letra original. Siempre devuelve nombre real O descriptor de rol.

Responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional, sin markdown), con este formato:
{"A": "Nombre Apellido - Rol", "B": "Descriptor - Rol", "C": "..."}

TRANSCRIPCIÓN:
${transcriptionText.substring(0, 15000)}`;

    const speakerIdMessages = [
      { role: 'user', content: [{ type: 'text', text: speakerIdPrompt }] },
    ];

    const speakerIdResult = await callQwenStreaming(
      qwenApiKey, TEXT_MODEL, speakerIdMessages, requestId, 'speaker-id', 2048
    );

    if (!speakerIdResult.success || !speakerIdResult.data) {
      return { text: outText, status: 'failed', method, error: speakerIdResult.error || 'Qwen call failed', identifiedCount };
    }

    const jsonMatch = speakerIdResult.data.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return { text: outText, status: 'failed', method, error: 'No JSON object found in model response', identifiedCount };
    }

    try {
      const speakerMap = JSON.parse(jsonMatch[0]);
      console.log(`[qwen-tv][${requestId}] Speaker map:`, JSON.stringify(speakerMap));

      for (const [letter, nameRole] of Object.entries(speakerMap)) {
        if (nameRole && typeof nameRole === 'string' && nameRole !== letter && nameRole.trim().length > 0) {
          const regex = new RegExp(`SPEAKER ${letter}(?!\\s*\\()`, 'g');
          const before = outText;
          outText = outText.replace(regex, `SPEAKER ${letter} (${nameRole})`);
          if (before !== outText) identifiedCount++;
        }
      }

      if (identifiedCount > 0) {
        status = 'success';
        console.log(`[qwen-tv][${requestId}] Identified ${identifiedCount} speakers`);
      } else {
        status = 'failed';
        error = 'No speakers matched in transcription';
      }
    } catch (parseErr) {
      status = 'failed';
      error = `JSON parse error: ${(parseErr as Error).message}`;
      console.warn(`[qwen-tv][${requestId}] Speaker map JSON parse failed:`, parseErr);
    }
  } catch (speakerErr) {
    status = 'failed';
    error = (speakerErr as Error).message;
    console.warn(`[qwen-tv][${requestId}] Speaker identification failed (non-fatal):`, speakerErr);
  }

  return { text: outText, status, method, error, identifiedCount };
}

// ═══════════════════════════════════════════════════════════════════════
// MASTER PROMPTS — Ported from process-tv-with-gemini for full parity
// ═══════════════════════════════════════════════════════════════════════

function buildTranscriptionOnlyPrompt(): string {
  return `Eres un transcriptor experto de contenido audiovisual en español de Puerto Rico y el Caribe.

Tu ÚNICA tarea es transcribir PALABRA POR PALABRA todo el diálogo que escuchas en el video, separando por hablantes.

FORMATO REQUERIDO - Usa EXACTAMENTE este formato (es CRÍTICO usar "SPEAKER" en inglés):

SPEAKER 1: [Transcripción textual exacta de todo lo que dice]
SPEAKER 2: [Transcripción textual exacta de todo lo que dice]
SPEAKER 1: [Si el primer hablante vuelve a hablar]
SPEAKER 3: [Si aparece un tercer hablante]

IMPORTANTE: Debes usar la palabra "SPEAKER" (en inglés) seguida del número. NO uses "HABLANTE" ni otras palabras en español.

IDENTIFICACIÓN VISUAL DE HABLANTES:
✓ USA TU CAPACIDAD DE VISIÓN para identificar a los hablantes
✓ LEE los "lower thirds" (subtítulos con nombres en la parte inferior de la pantalla)
✓ LEE las tarjetas gráficas con nombres que aparezcan en pantalla
✓ IDENTIFICA logos de TV y canales para contexto
✓ RECONOCE personalidades conocidas de noticias de Puerto Rico visualmente
✓ DISTINGUE entre: Presentador/Anchor, Reportero en campo, Invitado/Entrevistado, Voz en off
✓ FORMATO CON NOMBRE Y ROL: SPEAKER 1 (Aixa Vázquez - Presentadora):
✓ Si NO puedes identificar visualmente, usa solo: SPEAKER 1:

REGLAS DE TRANSCRIPCIÓN:
✓ Transcribe TODO el diálogo palabra por palabra
✓ Identifica correctamente cuando cambia el hablante
✓ Mantén el orden cronológico estricto
✓ Incluye pausas significativas con [pausa]
✓ Incluye eventos importantes como [aplausos], [risas], [música]
✓ NO resumas NI parafrasees - transcribe EXACTAMENTE lo que escuchas
✓ NO incluyas análisis, opiniones ni interpretaciones

REGLA CRÍTICA DE CONTINUIDAD DE HABLANTES:
✓ Si un hablante que YA identificaste (ej: SPEAKER 1) vuelve a hablar DESPUÉS de otro hablante (SPEAKER 2), DEBES seguir usando SPEAKER 1
✓ NUNCA incrementes el número para el mismo hablante
✓ Si no estás seguro si es el mismo hablante o uno nuevo, usa el número anterior (mejor reutilizar que crear incorrecto)
✓ Verifica visualmente: ¿es la misma persona en pantalla? ¿mismo rol? ¿mismo nombre en lower-third?

NORMALIZACIÓN DE CANALES DE TV DE PUERTO RICO:
Al transcribir, usa SIEMPRE los nombres oficiales de los canales de televisión puertorriqueños aunque la pronunciación sea fonética o coloquial:
- "Guapa TV" o "Guapa" → "WAPA TV" (Canal 4). La W en Puerto Rico puede sonar como "doble u", no "doble b".
- "Tele mundo" o "Te lo mundo" → "Telemundo" (Canal 2)
- "Uipr" o "Wi PR" o "W I P R" → "WIPR" (Canal 6)
- "Tele once" o "Tele Onse" → "TeleOnce" (Canal 11)
- "Tele oro" o "Teleoro" → "Tele Oro" (Canal 13)
- "ABC PR" o "ABC Puerto Rico" o "A B C PR" → "ABCPR" (ABC5)
- "Canal treinta y dos" → "Canal 32"
Si una frase suena muy parecida a uno de estos canales, usa la forma oficial.

FORMATO DE SALIDA:
Responde ÚNICAMENTE con la transcripción en el formato SPEAKER X: texto
NO incluyas títulos, encabezados, ni explicaciones adicionales.

Ejemplo de salida correcta:
SPEAKER 1 (Periodista): Buenos días Puerto Rico, hoy tenemos noticias importantes sobre...
SPEAKER 2 (Invitado): Gracias por la invitación. Quiero hablar sobre...
SPEAKER 1 (Periodista): Muy interesante. ¿Nos puede explicar más sobre...?`;
}

function buildAnalysisPrompt(
  categories: string[],
  clients: { name: string; keywords?: string[] }[],
  transcriptionText: string,
  contextText: string = ''
): string {
  // Default 16 categories (same as radio) when none provided from DB
  const categoriesText = categories.length > 0
    ? categories.join(', ')
    : 'ENTRETENIMIENTO, EDUCACION & CULTURA, COMUNIDAD, SALUD, CRIMEN, TRIBUNALES, AMBIENTE & EL TIEMPO, ECONOMIA & NEGOCIOS, GOBIERNO, POLITICA, EE.UU. & INTERNACIONALES, DEPORTES, RELIGION, OTRAS, ACCIDENTES, CIENCIA & TECNOLOGIA';

  // Client names list
  const clientsText = clients.length > 0
    ? clients.map(c => c.name).join(', ')
    : '';

  // Client-keyword correlation mapping (same format as radio)
  const clientKeywordMap = clients.length > 0
    ? clients.map(client => {
        const keywords = client.keywords && client.keywords.length > 0
          ? client.keywords.join(', ')
          : '—';
        return `- ${client.name}: ${keywords}`;
      }).join('\n')
    : '';

  let prompt = `Eres un analista experto en contenido de televisión de Puerto Rico y el Caribe. Tu tarea es analizar la siguiente transcripción de un programa de TV en español e identificar y separar el contenido publicitario del contenido regular del programa.

IMPORTANTE - FORMATO DE RESPUESTA:
Debes identificar y separar claramente cada sección de contenido, comenzando CADA SECCIÓN con uno de estos encabezados:

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

PARA CADA SECCIÓN DE ANUNCIO PUBLICITARIO:
1. Marca(s) o producto(s) anunciados
2. Mensajes clave del anuncio
3. Llamada a la acción (si existe)
4. Tono del anuncio
5. Duración aproximada

IDENTIFICACIÓN DE NOTICIAS INDIVIDUALES:
Primero, identifica cada NOTICIA INDIVIDUAL dentro del programa. Un noticiero típico contiene 8-15 noticias separadas por transiciones visuales (cambios de escena, gráficos, cortes comerciales breves).

Para CADA NOTICIA INDIVIDUAL, crea una sección separada con este formato:

[NOTICIA 1]
Título: [Título conciso de la noticia]
Resumen: [10-15 oraciones con los puntos clave]
Participantes: [Nombres de hablantes en esta noticia específica]

[NOTICIA 2]
Título: [Título conciso de la noticia]
Resumen: [10-15 oraciones con los puntos clave]
Participantes: [Nombres de hablantes en esta noticia específica]

[NOTICIA N]...

PARA CADA NOTICIA INDIVIDUAL incluye también:
1. Temas principales tratados en ESA noticia
2. Tono del contenido de ESA noticia
3. Categorías aplicables de: ${categoriesText}
4. Análisis 5W específico de ESA noticia
5. Palabras clave de ESA noticia
6. Puntuación de impacto noticioso (1-10) de ESA noticia

NOTA SOBRE CITAS: Usa citas textuales BREVES (máx. 1-2 oraciones) SOLO donde se requieran explícitamente (sección de Relevancia para Clientes). En el resumen y análisis general, parafrasea en tus propias palabras — NO copies párrafos completos de la transcripción.

2. Temas principales tratados (globales del programa)
   - Listar temas por orden de importancia
   - Incluir subtemas relacionados
   - Señalar conexiones entre temas si existen

3. Tono del contenido
   - Estilo de la presentación (formal/informal)
   - Tipo de lenguaje utilizado
   - Enfoque del contenido (informativo/editorial/debate/entrevista/reportaje)

4. Categorías aplicables de: ${categoriesText}
   - Justificar la selección de cada categoría
   - Indicar categoría principal y secundarias

5. Análisis 5W (Método periodístico):
   - QUIÉN: Personas, organizaciones, instituciones mencionadas (con nombres completos y cargos si están disponibles)
   - QUÉ: Eventos, acciones, decisiones principales
   - CUÁNDO: Fechas, tiempos, cronología de los eventos
   - DÓNDE: Lugares, ubicaciones geográficas (municipios, barrios, países)
   - POR QUÉ: Causas, motivos, razones identificadas

6. Palabras clave: Las 10-15 palabras o frases más relevantes del contenido

7. Puntuación de impacto noticioso: Del 1 al 10, con justificación

8. Alertas y recomendaciones: Situaciones de alto impacto o urgencia que requieran atención inmediata`;

  // Section 9: Presencia de personas o entidades
  prompt += `

9. Presencia de personas o entidades relevantes mencionadas`;

  // Section 10: Client relevance (only relevant clients)
  if (clientsText && clientKeywordMap) {
    prompt += `

10. **Relevancia para Clientes**: Evalúa el contenido contra la siguiente lista de clientes. SOLO incluye los clientes para los cuales el contenido ES relevante (nivel ALTA o MEDIA). NO listes clientes que no tienen relevancia.

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
    - Citas textuales de la transcripción que justifican la relevancia`;
  } else if (clientsText) {
    prompt += `

10. **Relevancia para Clientes**: Evalúa el contenido contra la siguiente lista de clientes. SOLO incluye los clientes relevantes (ALTA o MEDIA). Omite los no relevantes.

Lista de clientes: ${clientsText}

Para cada cliente RELEVANTE indica:
    - Nombre del cliente
    - Nivel de relevancia: ALTA / MEDIA
    - Razón de relevancia
    - Citas textuales de la transcripción que justifican la relevancia`;
  }

  // Closing instructions
  prompt += `

Responde en español de manera concisa y profesional. Asegúrate de:
1. Comenzar SIEMPRE con el encabezado de tipo de contenido correspondiente en mayúsculas
2. Si es un anuncio, enfatizar las marcas, productos y llamadas a la acción
3. Si es contenido regular, mantener el formato de análisis detallado con TODOS los puntos mencionados
4. Incluir las palabras textuales que justifiquen las asociaciones con clientes o palabras clave
5. Utilizar los nombres específicos de los hablantes cuando estén disponibles en lugar de referencias genéricas
6. Usar citas textuales BREVES (1-2 oraciones máx.) únicamente donde se requieran (relevancia de clientes); en otras secciones, parafrasear
7. Incluir la sección de Relevancia para Clientes SOLO con los clientes relevantes (omitir los no relevantes)`;

  // Add additional context
  if (contextText) {
    prompt += `\n\nContexto adicional: ${contextText}`;
  }

  // Append the transcription
  prompt += `

═══════════════════════════════════════════════════════════════
TRANSCRIPCIÓN A ANALIZAR:
═══════════════════════════════════════════════════════════════

${transcriptionText}`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════════════════
// Qwen Streaming API Call
// ═══════════════════════════════════════════════════════════════════════

async function callQwenStreaming(
  apiKey: string,
  model: string,
  messages: any[],
  requestId: string,
  stage: string,
  maxTokens: number = 16384
): Promise<{ success: boolean; data?: string; error?: string; statusCode?: number }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[qwen-tv][${requestId}] ${stage} attempt ${attempt}/${MAX_RETRIES} with model ${model}`);

    try {
      const response = await fetch(QWEN_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          modalities: ['text'],
          stream: true,
          stream_options: { include_usage: true },
          temperature: 0.1,
          max_tokens: maxTokens,
        }),
      });

      if (response.status === 429) {
        const backoffMs = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
        console.warn(`[qwen-tv][${requestId}] ${stage} 429 rate limited, backing off ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      if (response.status === 503 || response.status === 500) {
        const backoffMs = 3000 * attempt;
        console.warn(`[qwen-tv][${requestId}] ${stage} server error ${response.status}, backing off ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[qwen-tv][${requestId}] ${stage} error ${response.status}:`, errorText);
        return { success: false, error: `HTTP ${response.status}: ${errorText}`, statusCode: response.status };
      }

      // Parse SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        return { success: false, error: 'No response body reader available' };
      }

      const decoder = new TextDecoder();
      let collectedText = '';
      let buffer = '';
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) collectedText += delta;
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens || inputTokens;
              outputTokens = parsed.usage.completion_tokens || outputTokens;
            }
          } catch {
            // partial JSON, skip
          }
        }
      }

      if (!collectedText) {
        console.error(`[qwen-tv][${requestId}] ${stage} streaming produced no text`);
        return { success: false, error: 'Streaming response produced no text content' };
      }

      console.log(`[qwen-tv][${requestId}] ${stage} streaming success on attempt ${attempt}, chars=${collectedText.length}, tokens: input=${inputTokens}, output=${outputTokens}`);
      return { success: true, data: collectedText };

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[qwen-tv][${requestId}] ${stage} attempt ${attempt} exception:`, msg);
      if (attempt === MAX_RETRIES) {
        return { success: false, error: `All retries failed: ${msg}` };
      }
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  return { success: false, error: 'Max retries exhausted' };
}

// ═══════════════════════════════════════════════════════════════════════
// AssemblyAI: STREAMING upload (one chunk at a time, ~15MB peak memory)
// ═══════════════════════════════════════════════════════════════════════

async function streamChunksToAssemblyAI(
  supabaseClient: any,
  sessionId: string,
  totalChunks: number,
  totalBytes: number,
  assemblyAiKey: string,
  requestId: string,
  transcriptId: string | null
): Promise<string> {
  console.log(`[qwen-tv][${requestId}] Streaming ${totalChunks} chunks (${(totalBytes / 1024 / 1024).toFixed(1)}MB) to AssemblyAI`);

  let currentChunkIndex = 0;

  const stream = new ReadableStream({
    async pull(controller) {
      if (currentChunkIndex >= totalChunks) {
        controller.close();
        return;
      }

      const i = currentChunkIndex;
      const chunkPath = `chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`;

      try {
        const { data: chunkData, error: chunkError } = await supabaseClient
          .storage
          .from('video')
          .download(chunkPath);

        if (chunkError || !chunkData) {
          controller.error(new Error(`Failed to download chunk ${i}: ${chunkError?.message}`));
          return;
        }

        const arrayBuf = await chunkData.arrayBuffer();
        controller.enqueue(new Uint8Array(arrayBuf));

        currentChunkIndex++;

        if (currentChunkIndex % 5 === 0 || currentChunkIndex === totalChunks) {
          console.log(`[qwen-tv][${requestId}] Streamed chunk ${currentChunkIndex}/${totalChunks}`);
        }

        // Update progress in 10-30% range
        if (transcriptId && (currentChunkIndex % 3 === 0 || currentChunkIndex === totalChunks)) {
          const dlProgress = Math.round(10 + (currentChunkIndex / totalChunks) * 20);
          await supabaseClient
            .from('tv_transcriptions')
            .update({ progress: dlProgress })
            .eq('id', transcriptId);
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });

  // Upload stream to AssemblyAI
  const uploadResponse = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': assemblyAiKey,
      'Content-Type': 'application/octet-stream',
      'Transfer-Encoding': 'chunked',
    },
    body: stream,
  });

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    throw new Error(`AssemblyAI upload failed (${uploadResponse.status}): ${errText}`);
  }

  const { upload_url } = await uploadResponse.json();
  console.log(`[qwen-tv][${requestId}] AssemblyAI streaming upload complete: ${upload_url}`);
  return upload_url;
}

async function transcribeWithAssemblyAI(
  uploadUrl: string,
  assemblyAiKey: string,
  requestId: string,
  transcriptId: string | null,
  supabaseClient: any
): Promise<string> {
  console.log(`[qwen-tv][${requestId}] Creating AssemblyAI transcription job...`);

  if (transcriptId) {
    await supabaseClient
      .from('tv_transcriptions')
      .update({ progress: 35 })
      .eq('id', transcriptId);
  }

  const transcriptResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
    method: 'POST',
    headers: {
      'Authorization': assemblyAiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: uploadUrl,
      language_code: 'es',
      speaker_labels: true,
      speech_model: 'best',
      speakers_expected: 4,
      entity_detection: true,
    }),
  });

  if (!transcriptResponse.ok) {
    const errText = await transcriptResponse.text();
    throw new Error(`AssemblyAI transcription creation failed (${transcriptResponse.status}): ${errText}`);
  }

  const transcriptJob = await transcriptResponse.json();
  const jobId = transcriptJob.id;
  console.log(`[qwen-tv][${requestId}] AssemblyAI job created: ${jobId}`);

  // Poll for completion
  const maxPollTime = 15 * 60 * 1000;
  const pollInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollTime) {
    await new Promise(r => setTimeout(r, pollInterval));

    const pollResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${jobId}`, {
      headers: { 'Authorization': assemblyAiKey },
    });

    if (!pollResponse.ok) {
      console.warn(`[qwen-tv][${requestId}] AssemblyAI poll error: ${pollResponse.status}`);
      await pollResponse.text(); // consume body
      continue;
    }

    const pollData = await pollResponse.json();

    if (pollData.status === 'completed') {
      console.log(`[qwen-tv][${requestId}] AssemblyAI transcription completed`);

      // Format with speaker labels
      let formattedText = '';
      if (pollData.utterances && pollData.utterances.length > 0) {
        for (const utt of pollData.utterances) {
          const startMs = utt.start;
          const minutes = Math.floor(startMs / 60000);
          const seconds = Math.floor((startMs % 60000) / 1000);
          const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
          formattedText += `${timestamp} SPEAKER ${utt.speaker}: ${utt.text}\n\n`;
        }
      } else {
        formattedText = pollData.text || '';
      }

      if (transcriptId) {
        await supabaseClient
          .from('tv_transcriptions')
          .update({ progress: 50 })
          .eq('id', transcriptId);
      }

      return formattedText;
    }

    if (pollData.status === 'error') {
      throw new Error(`AssemblyAI transcription error: ${pollData.error}`);
    }

    // Update progress in 35-50% range during polling
    if (transcriptId) {
      const elapsed = Date.now() - startTime;
      const pollProgress = Math.min(49, Math.round(35 + (elapsed / maxPollTime) * 15));
      await supabaseClient
        .from('tv_transcriptions')
        .update({ progress: pollProgress })
        .eq('id', transcriptId);
    }

    console.log(`[qwen-tv][${requestId}] AssemblyAI status: ${pollData.status}, elapsed: ${Math.round((Date.now() - startTime) / 1000)}s`);
  }

  throw new Error('AssemblyAI transcription timed out after 15 minutes');
}

// ═══════════════════════════════════════════════════════════════════════
// Extract structured DB fields from free-text analysis output
// ═══════════════════════════════════════════════════════════════════════

function extractAnalysisFieldsFromText(text: string, payload: any): void {
  if (!text || text.startsWith('Error en análisis')) return;

  // Extract 5W fields using common patterns
  const extract5W = (label: string): string | undefined => {
    const patterns = [
      new RegExp(`${label}[:\\s]*([^\\n]+(?:\\n(?![A-ZÁÉÍÓÚÑÜ]{3,})[^\\n]+)*)`, 'i'),
      new RegExp(`\\*\\*${label}\\*\\*[:\\s]*([^\\n]+)`, 'i'),
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return m[1].trim().replace(/^\*\*|\*\*$/g, '');
    }
    return undefined;
  };

  const quien = extract5W('QUI[EÉ]N');
  const que = extract5W('QU[EÉ]');
  const cuando = extract5W('CU[AÁ]NDO');
  const donde = extract5W('D[OÓ]NDE');
  const porque = extract5W('POR QU[EÉ]');

  if (quien) payload.analysis_quien = quien;
  if (que) payload.analysis_que = que;
  if (cuando) payload.analysis_cuando = cuando;
  if (donde) payload.analysis_donde = donde;
  if (porque) payload.analysis_porque = porque;

  // Extract summary — look for "Resumen" section
  const resumenMatch = text.match(/(?:Resumen|RESUMEN)[^:]*:?\s*\n([\s\S]*?)(?=\n(?:\d+\.|Temas|TEMAS|Tono|TONO|Categor|CATEGOR|An[aá]lisis|ANÁLISIS|Palabras|PALABRAS|Puntuaci|PUNTUACI|Alertas|ALERTAS|\[TIPO))/i);
  if (resumenMatch) {
    const summary = resumenMatch[1].trim().substring(0, 2000);
    payload.summary = summary;
    payload.analysis_summary = summary;
  }

  // Extract category
  const catMatch = text.match(/Categor[ií]a(?:s)?\s+(?:principal|aplicable)[^:]*:\s*([^\n]+)/i);
  if (catMatch) {
    payload.analysis_category = catMatch[1].trim().replace(/^\*\*|\*\*$/g, '');
  }

  // Extract keywords
  const kwMatch = text.match(/Palabras\s+clave[^:]*:\s*([^\n]+)/i);
  if (kwMatch) {
    const kws = kwMatch[1].split(/[,;]/).map((k: string) => k.trim().replace(/^[-•]\s*/, '')).filter(Boolean);
    if (kws.length > 0) {
      payload.analysis_keywords = kws;
      payload.keywords = kws;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Background processor for chunked videos (runs via EdgeRuntime.waitUntil)
// ═══════════════════════════════════════════════════════════════════════

async function processChunkedInBackground(
  supabaseClient: any,
  sessionId: string,
  transcriptId: string,
  qwenApiKey: string,
  assemblyAiKey: string,
  categories: string[],
  clients: any[],
  requestId: string
): Promise<void> {
  let reachedTerminal = false;

  try {
    // 1. Look up session
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('chunked_upload_sessions')
      .select('session_id, file_name, total_chunks, status, uploaded_chunks, file_size')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error(`Chunked session ${sessionId} not found: ${sessionError?.message}`);
    }
    if (sessionData.uploaded_chunks !== sessionData.total_chunks) {
      throw new Error(`Incomplete upload: ${sessionData.uploaded_chunks}/${sessionData.total_chunks} chunks`);
    }

    const totalChunks = sessionData.total_chunks;
    const totalBytes = sessionData.file_size || totalChunks * 15 * 1024 * 1024;
    console.log(`[qwen-tv][${requestId}] Background: ${totalChunks} chunks, ~${(totalBytes / 1024 / 1024).toFixed(0)}MB`);

    // 2. Stream chunks to AssemblyAI (no in-memory buffering)
    const uploadUrl = await streamChunksToAssemblyAI(
      supabaseClient, sessionId, totalChunks, totalBytes, assemblyAiKey, requestId, transcriptId
    );

    // 3. Transcribe via AssemblyAI
    let transcriptionText = await transcribeWithAssemblyAI(
      uploadUrl, assemblyAiKey, requestId, transcriptId, supabaseClient
    );

    console.log(`[qwen-tv][${requestId}] Background: Transcription complete, ${transcriptionText.length} chars`);

    // 3a. Normalize Puerto Rican TV channel names in AssemblyAI output
    const prChannelNormalizations: [RegExp, string][] = [
      [/\bGuapa TV\b/gi, 'WAPA TV'],
      [/\bGuapa\b/gi, 'WAPA'],
      [/\bWapa TV\b/gi, 'WAPA TV'],
      [/\bWapa\b/g, 'WAPA'],
      [/\bTele mundo\b/gi, 'Telemundo'],
      [/\bTe lo mundo\b/gi, 'Telemundo'],
      [/\bUipr\b/gi, 'WIPR'],
      [/\bWi PR\b/gi, 'WIPR'],
      [/\bW I P R\b/gi, 'WIPR'],
      [/\bWipr\b/g, 'WIPR'],
      [/\bTele once\b/gi, 'TeleOnce'],
      [/\bTele Onse\b/gi, 'TeleOnce'],
      [/\bTele oro\b/gi, 'Tele Oro'],
      [/\bTeleoro\b/gi, 'Tele Oro'],
      [/\bABC PR\b/gi, 'ABCPR'],
      [/\bABC Puerto Rico\b/gi, 'ABCPR'],
      [/\bA B C PR\b/gi, 'ABCPR'],
      [/\bA B C Puerto Rico\b/gi, 'ABCPR'],
    ];
    for (const [pattern, replacement] of prChannelNormalizations) {
      transcriptionText = transcriptionText.replace(pattern, replacement);
    }
    console.log(`[qwen-tv][${requestId}] Background: PR channel names normalized`);

    // 3b. Speaker name identification via Qwen TEXT model (qwen-plus)
    // NOTE: Previous implementation tried to send raw video chunks to qwen-vl-max,
    // which always failed with "Invalid video file" because:
    //   1) qwen-vl-max is image-only (not video)
    //   2) chunk_0000 is a 15MB byte slice without valid MP4 headers
    // We now use text-only dialogue analysis (self-introductions, mentions by name,
    // role indicators) which is reliable and 0-extra-cost (qwen-plus is cheap).
    const speakerIdOutcome = await identifySpeakersFromText(transcriptionText, qwenApiKey, requestId);
    transcriptionText = speakerIdOutcome.text;
    const speakerIdStatus = speakerIdOutcome.status;
    const speakerIdMethod = speakerIdOutcome.method;
    const speakerIdError = speakerIdOutcome.error;

    // Save transcription immediately
    await supabaseClient
      .from('tv_transcriptions')
      .update({
        transcription_text: transcriptionText,
        progress: 55,
        provider_used: 'assemblyai+qwen-text',
        speaker_id_status: speakerIdStatus,
        speaker_id_method: speakerIdMethod,
        speaker_id_error: speakerIdError,
      })
      .eq('id', transcriptId);

    // 4. Analysis via Qwen (text-only)
    console.log(`[qwen-tv][${requestId}] Background: Starting Qwen text analysis`);
    await new Promise(r => setTimeout(r, 5000)); // rate limit spacing

    const analysisPrompt = buildAnalysisPrompt(categories, clients, transcriptionText);
    const analysisMessages = [
      { role: 'user', content: [{ type: 'text', text: analysisPrompt }] },
    ];

    let analysisResult = await callQwenStreaming(qwenApiKey, TEXT_MODEL, analysisMessages, requestId, 'bg-analysis', 32768);

    if (!analysisResult.success) {
      console.warn(`[qwen-tv][${requestId}] Background: Primary model failed, falling back`);
      analysisResult = await callQwenStreaming(qwenApiKey, TEXT_MODEL_FALLBACK, analysisMessages, requestId, 'bg-analysis-fallback', 32768);
    }

    let analysisText = '';
    let providerUsed = 'assemblyai+qwen-text';
    let fallbackReason: string | null = null;

    if (analysisResult.success) {
      analysisText = analysisResult.data!;
      console.log(`[qwen-tv][${requestId}] Background: Analysis complete, ${analysisText.length} chars`);
    } else {
      fallbackReason = `Analysis: ${analysisResult.error}`;
      analysisText = `Error en análisis: ${analysisResult.error}`;
    }

    // 5. Write final results — store analysis as raw text (not JSON)
    const updatePayload: any = {
      status: 'completed',
      progress: 100,
      transcription_text: transcriptionText,
      full_analysis: analysisText,
      provider_used: providerUsed,
      provider_fallback_reason: fallbackReason,
      updated_at: new Date().toISOString(),
    };

    // Extract structured fields from text using regex
    extractAnalysisFieldsFromText(analysisText, updatePayload);

    const { error: updateError } = await supabaseClient
      .from('tv_transcriptions')
      .update(updatePayload)
      .eq('id', transcriptId);

    if (updateError) {
      console.error(`[qwen-tv][${requestId}] Background: DB update error:`, updateError);
    } else {
      console.log(`[qwen-tv][${requestId}] Background: Completed successfully`);
    }

    reachedTerminal = true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[qwen-tv][${requestId}] Background fatal error:`, errorMessage);

    let failureStatus = 'failed:runtime';
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) failureStatus = 'failed:qwen_rate_limit';
    else if (errorMessage.includes('AssemblyAI')) failureStatus = 'failed:assemblyai_error';
    else if (errorMessage.includes('timed out')) failureStatus = 'failed:timeout';
    else if (errorMessage.includes('not found') || errorMessage.includes('Incomplete')) failureStatus = 'failed:qwen_chunk_input';

    try {
      await supabaseClient
        .from('tv_transcriptions')
        .update({
          status: failureStatus,
          progress: 0,
          provider_fallback_reason: errorMessage.substring(0, 500),
        })
        .eq('id', transcriptId);
    } catch (dbErr) {
      console.warn(`[qwen-tv][${requestId}] Background: Could not update failure status:`, dbErr);
    }
    reachedTerminal = true;
  } finally {
    // Safety net: if we somehow didn't reach a terminal status, force one
    if (!reachedTerminal) {
      try {
        await supabaseClient
          .from('tv_transcriptions')
          .update({ status: 'failed:runtime', progress: 0, provider_fallback_reason: 'Background task terminated unexpectedly' })
          .eq('id', transcriptId);
      } catch { /* best effort */ }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[qwen-tv][${requestId}] Function invoked`);

  try {
    // ── Validate env ──
    const qwenApiKey = Deno.env.get('QWEN_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const assemblyAiKey = Deno.env.get('ASSEMBLYAI_API_KEY');

    if (!qwenApiKey) throw new Error('QWEN_API_KEY no configurada');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Variables de Supabase no configuradas');

    // ── Auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Token de autorización requerido');

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error('Usuario no autenticado');

    console.log(`[qwen-tv][${requestId}] User authenticated: ${user.id}`);

    // ── Parse request ──
    const body = await req.json();
    const {
      videoPath,
      transcriptionId,
      transcriptId: transcriptIdAlt,
      categories = [],
      clients = [],
    } = body;
    const transcriptId = transcriptionId || transcriptIdAlt;

    if (!videoPath) throw new Error('videoPath es requerido');

    // ── Fetch clients/categories from DB when not provided by frontend ──
    let resolvedClients = clients;
    let resolvedCategories = categories;

    if (resolvedClients.length === 0) {
      console.log(`[qwen-tv][${requestId}] No clients from frontend, fetching from DB...`);
      const { data: dbClients } = await supabaseClient
        .from('clients')
        .select('name, keywords');
      resolvedClients = dbClients || [];
      console.log(`[qwen-tv][${requestId}] Fetched ${resolvedClients.length} clients from DB`);
    }

    if (resolvedCategories.length === 0) {
      console.log(`[qwen-tv][${requestId}] No categories from frontend, fetching from DB...`);
      const { data: dbCategories } = await supabaseClient
        .from('categories')
        .select('name_es');
      resolvedCategories = (dbCategories || []).map((c: any) => c.name_es);
      console.log(`[qwen-tv][${requestId}] Fetched ${resolvedCategories.length} categories from DB`);
    }

    console.log(`[qwen-tv][${requestId}] Processing:`, {
      videoPath,
      transcriptId,
      categoriesCount: resolvedCategories.length,
      clientsCount: resolvedClients.length,
    });

    // ── Detect chunked vs single-file path ──
    const isChunked = videoPath.startsWith('chunked:');

    if (isChunked) {
      // ══════════════════════════════════════════════════════════════
      // CHUNKED PATH: Return 202 immediately, process in background
      // ══════════════════════════════════════════════════════════════
      const sessionId = videoPath.replace('chunked:', '').split('/')[0];
      console.log(`[qwen-tv][${requestId}] Chunked video detected, session: ${sessionId}`);

      if (!assemblyAiKey) {
        throw new Error('ASSEMBLYAI_API_KEY no configurada — requerida para videos grandes');
      }

      // Update status to processing
      if (transcriptId) {
        await supabaseClient
          .from('tv_transcriptions')
          .update({ status: 'processing', progress: 5, provider_used: 'assemblyai+qwen-text' })
          .eq('id', transcriptId);
      }

      // Launch background processing (non-blocking)
      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      EdgeRuntime.waitUntil(
        processChunkedInBackground(
          supabaseClient, sessionId, transcriptId, qwenApiKey, assemblyAiKey,
          resolvedCategories, resolvedClients, requestId
        )
      );

      // Return immediately — frontend polls tv_transcriptions for status
      return new Response(
        JSON.stringify({
          success: true,
          status: 'processing',
          transcriptionId: transcriptId,
          message: 'Video grande detectado. Procesamiento iniciado en segundo plano.',
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // SINGLE-FILE PATH: Qwen streaming (synchronous)
    // ══════════════════════════════════════════════════════════════════

    // Update status to processing
    if (transcriptId) {
      await supabaseClient
        .from('tv_transcriptions')
        .update({ status: 'processing', progress: 10, provider_used: 'qwen-primary' })
        .eq('id', transcriptId);
    }

    console.log(`[qwen-tv][${requestId}] Single file path: ${videoPath}`);

    const { data: signedUrlData, error: signedUrlError } = await supabaseClient
      .storage
      .from('video')
      .createSignedUrl(videoPath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(`No se pudo generar URL firmada: ${signedUrlError?.message}`);
    }

    const videoUrl = signedUrlData.signedUrl;
    console.log(`[qwen-tv][${requestId}] Signed URL generated`);

    const transcriptionMessages = [
      {
        role: 'user',
        content: [
          { type: 'video_url', video_url: { url: videoUrl } },
          { type: 'text', text: buildTranscriptionOnlyPrompt() },
        ],
      },
    ];

    let providerUsed = 'qwen-primary';
    let fallbackReason: string | null = null;

    let transcriptionResult = await callQwenStreaming(qwenApiKey, PRIMARY_MODEL, transcriptionMessages, requestId, 'transcription');

    if (!transcriptionResult.success) {
      console.warn(`[qwen-tv][${requestId}] Primary failed, falling back to ${FALLBACK_MODEL}`);
      fallbackReason = `Transcription: ${transcriptionResult.error}`;
      providerUsed = 'qwen-fallback';
      transcriptionResult = await callQwenStreaming(qwenApiKey, FALLBACK_MODEL, transcriptionMessages, requestId, 'transcription-fallback');
    }

    if (!transcriptionResult.success) {
      throw new Error(`Transcripción falló: ${transcriptionResult.error}`);
    }

    let transcriptionText = transcriptionResult.data!;
    console.log(`[qwen-tv][${requestId}] Transcription complete, length: ${transcriptionText.length} chars`);

    // Update progress
    if (transcriptId) {
      await supabaseClient
        .from('tv_transcriptions')
        .update({ progress: 50, transcription_text: transcriptionText })
        .eq('id', transcriptId);
    }

    // ── Stage 3 (single-file): Speaker name identification via Qwen text-only ──
    const sfSpeakerOutcome = await identifySpeakersFromText(transcriptionText, qwenApiKey, requestId);
    transcriptionText = sfSpeakerOutcome.text;
    if (transcriptId) {
      await supabaseClient
        .from('tv_transcriptions')
        .update({
          transcription_text: transcriptionText,
          progress: 55,
          speaker_id_status: sfSpeakerOutcome.status,
          speaker_id_method: sfSpeakerOutcome.method,
          speaker_id_error: sfSpeakerOutcome.error,
        })
        .eq('id', transcriptId);
    }

    // ── Stage 2: Analysis via Qwen (text-only) ──
    console.log(`[qwen-tv][${requestId}] Starting Stage 2: Analysis`);
    await new Promise(r => setTimeout(r, 5000));

    const analysisPrompt = buildAnalysisPrompt(resolvedCategories, resolvedClients, transcriptionText);
    const analysisMessages = [
      { role: 'user', content: [{ type: 'text', text: analysisPrompt }] },
    ];

    let analysisResult = await callQwenStreaming(qwenApiKey, TEXT_MODEL, analysisMessages, requestId, 'analysis', 32768);

    if (!analysisResult.success) {
      console.warn(`[qwen-tv][${requestId}] Primary text model failed for analysis, falling back`);
      if (!fallbackReason) fallbackReason = `Analysis: ${analysisResult.error}`;
      analysisResult = await callQwenStreaming(qwenApiKey, TEXT_MODEL_FALLBACK, analysisMessages, requestId, 'analysis-fallback', 32768);
    }

    let analysisText = '';
    if (analysisResult.success) {
      analysisText = analysisResult.data!;
      console.log(`[qwen-tv][${requestId}] Analysis complete, ${analysisText.length} chars`);
    } else {
      analysisText = `Error en análisis: ${analysisResult.error}`;
    }

    // ── Write results to DB ──
    if (transcriptId) {
      const updatePayload: any = {
        status: 'completed',
        progress: 100,
        transcription_text: transcriptionText,
        full_analysis: analysisText,
        provider_used: providerUsed,
        provider_fallback_reason: fallbackReason,
        updated_at: new Date().toISOString(),
      };

      // Extract structured fields from text using regex
      extractAnalysisFieldsFromText(analysisText, updatePayload);

      const { error: updateError } = await supabaseClient
        .from('tv_transcriptions')
        .update(updatePayload)
        .eq('id', transcriptId);

      if (updateError) {
        console.error(`[qwen-tv][${requestId}] DB update error:`, updateError);
      } else {
        console.log(`[qwen-tv][${requestId}] DB updated successfully`);
      }
    }

    console.log(`[qwen-tv][${requestId}] Processing complete. Provider: ${providerUsed}`);

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptionText,
        analysis: analysisText,
        provider_used: providerUsed,
        fallback_reason: fallbackReason,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[qwen-tv][${requestId}] Fatal error:`, errorMessage);

    let failureStatus = 'failed:runtime';
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) failureStatus = 'failed:qwen_rate_limit';
    else if (errorMessage.includes('not found') || errorMessage.includes('Incomplete upload')) failureStatus = 'failed:qwen_chunk_input';
    else if (errorMessage.includes('exceeded the maximum')) failureStatus = 'failed:supabase_storage_limit';
    else if (errorMessage.includes('AssemblyAI')) failureStatus = 'failed:assemblyai_error';
    else if (errorMessage.includes('timed out')) failureStatus = 'failed:timeout';

    // Update DB with specific failure status
    try {
      const body = await req.clone().json().catch(() => null);
      const tid = body?.transcriptionId || body?.transcriptId;
      if (tid) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const sc = createClient(supabaseUrl, supabaseServiceKey);
        await sc
          .from('tv_transcriptions')
          .update({
            status: failureStatus,
            progress: 0,
            provider_fallback_reason: errorMessage.substring(0, 500),
          })
          .eq('id', tid);
        console.log(`[qwen-tv][${requestId}] Updated transcription to ${failureStatus}`);
      }
    } catch (dbErr) {
      console.warn(`[qwen-tv][${requestId}] Could not update failure status:`, dbErr);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        failureStatus,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
