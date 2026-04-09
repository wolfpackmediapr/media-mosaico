
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
const MAX_RETRIES = 3;

const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2';

// ─── Prompts ───────────────────────────────────────────────────────────

function buildTranscriptionPrompt(): string {
  return `Eres un experto transcriptor de contenido televisivo de Puerto Rico y el Caribe.

Tu tarea es transcribir completamente el audio y video proporcionado, identificando a cada hablante.

INSTRUCCIONES:
1. Transcribe TODO el diálogo completo, sin omitir nada
2. Identifica cada hablante usando el formato: SPEAKER X (Nombre - Rol):
3. Lee los "lower thirds", chyrons y gráficos en pantalla para identificar nombres
4. Distingue roles: Presentador/Anchor, Reportero, Invitado, Analista, Voz en off
5. Si no puedes identificar al hablante, usa: SPEAKER X:
6. Mantén el orden cronológico
7. Incluye marcas de tiempo aproximadas cada 30 segundos en formato [MM:SS]

FORMATO DE SALIDA:
[00:00] SPEAKER 1 (Nombre - Rol): texto completo...
[00:30] SPEAKER 2 (Nombre - Rol): texto completo...

Responde SOLO con la transcripción, sin comentarios adicionales.`;
}

function buildAnalysisPrompt(
  categories: string[],
  clients: { name: string; keywords?: string[] }[],
  transcriptionText: string
): string {
  const categoriesText = categories.length > 0
    ? `Categorías disponibles: ${categories.join(', ')}`
    : 'Sin categorías específicas';

  const clientsText = clients.length > 0
    ? `Clientes relevantes: ${clients.map(c => `${c.name} (keywords: ${c.keywords?.join(', ') || 'ninguna'})`).join('; ')}`
    : 'Sin clientes específicos';

  return `Eres un experto analista de contenido de televisión especializado en noticias de Puerto Rico y el Caribe.

Analiza la siguiente transcripción de un programa de TV y proporciona un análisis estructurado en formato JSON.

${categoriesText}
${clientsText}

TRANSCRIPCIÓN:
${transcriptionText}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "categoria": "categoría principal del contenido",
  "relevancia_clientes": [
    {
      "cliente": "nombre del cliente",
      "nivel_relevancia": "alto/medio/bajo",
      "razon": "explicación"
    }
  ],
  "analisis_5w": {
    "quien": "personas y organizaciones mencionadas",
    "que": "eventos y acciones principales",
    "cuando": "información temporal",
    "donde": "ubicaciones mencionadas",
    "porque": "causas y motivos"
  },
  "palabras_clave": ["palabra1", "palabra2"],
  "resumen": "resumen ejecutivo del contenido",
  "alertas": ["alerta 1", "alerta 2"],
  "puntuacion_impacto": "1-10",
  "recomendaciones": ["recomendación 1"]
}`;
}

// ─── Qwen Streaming API Call ───────────────────────────────────────────

async function callQwenStreaming(
  apiKey: string,
  model: string,
  messages: any[],
  requestId: string,
  stage: string
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
          max_tokens: 16384,
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

// ─── AssemblyAI: Upload chunks and transcribe ──────────────────────────

async function transcribeViaAssemblyAI(
  supabaseClient: any,
  sessionId: string,
  assemblyAiKey: string,
  requestId: string,
  transcriptId: string | null
): Promise<string> {
  console.log(`[qwen-tv][${requestId}] AssemblyAI path: resolving chunks for session ${sessionId}`);

  // 1. Look up session
  const { data: sessionData, error: sessionError } = await supabaseClient
    .from('chunked_upload_sessions')
    .select('session_id, file_name, total_chunks, status, uploaded_chunks')
    .eq('session_id', sessionId)
    .single();

  if (sessionError || !sessionData) {
    throw new Error(`Chunked session ${sessionId} not found: ${sessionError?.message}`);
  }
  if (sessionData.uploaded_chunks !== sessionData.total_chunks) {
    throw new Error(`Incomplete upload: ${sessionData.uploaded_chunks}/${sessionData.total_chunks} chunks`);
  }

  const totalChunks = sessionData.total_chunks;
  console.log(`[qwen-tv][${requestId}] Downloading ${totalChunks} chunks for AssemblyAI upload...`);

  // 2. Download all chunks and concatenate
  const chunkBuffers: Uint8Array[] = [];
  let totalBytes = 0;

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = `chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`;
    const { data: chunkData, error: chunkError } = await supabaseClient
      .storage
      .from('video')
      .download(chunkPath);

    if (chunkError || !chunkData) {
      throw new Error(`Failed to download chunk ${i}: ${chunkError?.message}`);
    }

    const arrayBuf = await chunkData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    chunkBuffers.push(uint8);
    totalBytes += uint8.length;

    if ((i + 1) % 5 === 0 || i === totalChunks - 1) {
      console.log(`[qwen-tv][${requestId}] Downloaded chunk ${i + 1}/${totalChunks} (${(totalBytes / 1024 / 1024).toFixed(1)}MB total)`);
    }

    // Update progress: 10-30% range for download phase
    if (transcriptId && (i % 3 === 0 || i === totalChunks - 1)) {
      const dlProgress = Math.round(10 + (i + 1) / totalChunks * 20);
      await supabaseClient
        .from('tv_transcriptions')
        .update({ progress: dlProgress })
        .eq('id', transcriptId);
    }
  }

  // Concatenate all chunks into one buffer
  const fullFile = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunkBuffers) {
    fullFile.set(chunk, offset);
    offset += chunk.length;
  }
  console.log(`[qwen-tv][${requestId}] Full file assembled in memory: ${(totalBytes / 1024 / 1024).toFixed(1)}MB`);

  // 3. Upload to AssemblyAI
  console.log(`[qwen-tv][${requestId}] Uploading to AssemblyAI...`);
  if (transcriptId) {
    await supabaseClient
      .from('tv_transcriptions')
      .update({ progress: 35 })
      .eq('id', transcriptId);
  }

  const uploadResponse = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': assemblyAiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: fullFile,
  });

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    throw new Error(`AssemblyAI upload failed (${uploadResponse.status}): ${errText}`);
  }

  const { upload_url } = await uploadResponse.json();
  console.log(`[qwen-tv][${requestId}] AssemblyAI upload complete: ${upload_url}`);

  // 4. Create transcription job
  console.log(`[qwen-tv][${requestId}] Creating AssemblyAI transcription job...`);
  if (transcriptId) {
    await supabaseClient
      .from('tv_transcriptions')
      .update({ progress: 40 })
      .eq('id', transcriptId);
  }

  const transcriptResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
    method: 'POST',
    headers: {
      'Authorization': assemblyAiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
      language_code: 'es',
      speaker_labels: true,
      auto_chapters: true,
      entity_detection: true,
      auto_highlights: true,
    }),
  });

  if (!transcriptResponse.ok) {
    const errText = await transcriptResponse.text();
    throw new Error(`AssemblyAI transcription creation failed (${transcriptResponse.status}): ${errText}`);
  }

  const transcriptJob = await transcriptResponse.json();
  const jobId = transcriptJob.id;
  console.log(`[qwen-tv][${requestId}] AssemblyAI job created: ${jobId}`);

  // 5. Poll for completion
  const maxPollTime = 15 * 60 * 1000; // 15 min max
  const pollInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollTime) {
    await new Promise(r => setTimeout(r, pollInterval));

    const pollResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${jobId}`, {
      headers: { 'Authorization': assemblyAiKey },
    });

    if (!pollResponse.ok) {
      console.warn(`[qwen-tv][${requestId}] AssemblyAI poll error: ${pollResponse.status}`);
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

    // Update progress in 40-50% range during polling
    if (transcriptId) {
      const elapsed = Date.now() - startTime;
      const pollProgress = Math.min(49, Math.round(40 + (elapsed / maxPollTime) * 10));
      await supabaseClient
        .from('tv_transcriptions')
        .update({ progress: pollProgress })
        .eq('id', transcriptId);
    }

    console.log(`[qwen-tv][${requestId}] AssemblyAI status: ${pollData.status}, elapsed: ${Math.round((Date.now() - startTime) / 1000)}s`);
  }

  throw new Error('AssemblyAI transcription timed out after 15 minutes');
}

// ─── Main Handler ──────────────────────────────────────────────────────

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

    console.log(`[qwen-tv][${requestId}] Processing:`, {
      videoPath,
      transcriptId,
      categoriesCount: categories.length,
      clientsCount: clients.length,
    });

    // ── Update status to processing ──
    if (transcriptId) {
      await supabaseClient
        .from('tv_transcriptions')
        .update({ status: 'processing', progress: 10, provider_used: 'qwen-primary' })
        .eq('id', transcriptId);
    }

    // ── Detect chunked vs single-file path ──
    const isChunked = videoPath.startsWith('chunked:');
    let transcriptionText: string;
    let providerUsed: string;
    let fallbackReason: string | null = null;

    if (isChunked) {
      // ── CHUNKED PATH: AssemblyAI for transcription, Qwen for analysis ──
      const sessionId = videoPath.replace('chunked:', '').split('/')[0];
      console.log(`[qwen-tv][${requestId}] Chunked video detected, session: ${sessionId}`);

      if (!assemblyAiKey) {
        throw new Error('ASSEMBLYAI_API_KEY no configurada — requerida para videos grandes');
      }

      // Transcribe via AssemblyAI (handles any file size)
      transcriptionText = await transcribeViaAssemblyAI(
        supabaseClient, sessionId, assemblyAiKey, requestId, transcriptId
      );
      providerUsed = 'assemblyai+qwen-text';

      console.log(`[qwen-tv][${requestId}] AssemblyAI transcription complete: ${transcriptionText.length} chars`);

    } else {
      // ── SINGLE-FILE PATH: Qwen streaming for transcription ──
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
            { type: 'text', text: buildTranscriptionPrompt() },
          ],
        },
      ];

      providerUsed = 'qwen-primary';

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

      transcriptionText = transcriptionResult.data!;
    }

    console.log(`[qwen-tv][${requestId}] Transcription complete, length: ${transcriptionText.length} chars`);

    // Update progress
    if (transcriptId) {
      await supabaseClient
        .from('tv_transcriptions')
        .update({ progress: 50, transcription_text: transcriptionText })
        .eq('id', transcriptId);
    }

    // ── Stage 2: Analysis via Qwen (text-only, works for both paths) ──
    console.log(`[qwen-tv][${requestId}] Starting Stage 2: Analysis`);

    // 5s delay between stages to respect rate limits
    await new Promise(r => setTimeout(r, 5000));

    const analysisPrompt = buildAnalysisPrompt(categories, clients, transcriptionText);
    const analysisMessages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: analysisPrompt },
        ],
      },
    ];

    const analysisModel = providerUsed === 'qwen-fallback' ? FALLBACK_MODEL : PRIMARY_MODEL;
    let analysisResult = await callQwenStreaming(qwenApiKey, analysisModel, analysisMessages, requestId, 'analysis');

    // Fallback for analysis too
    if (!analysisResult.success && analysisModel === PRIMARY_MODEL) {
      console.warn(`[qwen-tv][${requestId}] Primary model failed for analysis, falling back`);
      if (!fallbackReason) fallbackReason = `Analysis: ${analysisResult.error}`;
      providerUsed = isChunked ? 'assemblyai+qwen-fallback' : 'qwen-fallback';
      analysisResult = await callQwenStreaming(qwenApiKey, FALLBACK_MODEL, analysisMessages, requestId, 'analysis-fallback');
    }

    let parsedAnalysis: any = null;
    if (analysisResult.success) {
      try {
        const rawText = analysisResult.data!;
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedAnalysis = JSON.parse(jsonMatch[0]);
          console.log(`[qwen-tv][${requestId}] Analysis JSON parsed successfully`);
        } else {
          console.warn(`[qwen-tv][${requestId}] No JSON found in analysis, storing raw text`);
          parsedAnalysis = { raw_analysis: rawText, parsed: false };
        }
      } catch (parseErr) {
        console.warn(`[qwen-tv][${requestId}] JSON parse error, storing raw:`, parseErr);
        parsedAnalysis = { raw_analysis: analysisResult.data, parsed: false };
      }
    } else {
      console.error(`[qwen-tv][${requestId}] Analysis failed:`, analysisResult.error);
      parsedAnalysis = { error: analysisResult.error, parsed: false };
    }

    // ── Write results to DB ──
    if (transcriptId) {
      const updatePayload: any = {
        status: 'completed',
        progress: 100,
        transcription_text: transcriptionText,
        full_analysis: JSON.stringify(parsedAnalysis),
        provider_used: providerUsed,
        provider_fallback_reason: fallbackReason,
        updated_at: new Date().toISOString(),
      };

      if (parsedAnalysis && parsedAnalysis.analisis_5w) {
        updatePayload.analysis_quien = parsedAnalysis.analisis_5w.quien;
        updatePayload.analysis_que = parsedAnalysis.analisis_5w.que;
        updatePayload.analysis_cuando = parsedAnalysis.analisis_5w.cuando;
        updatePayload.analysis_donde = parsedAnalysis.analisis_5w.donde;
        updatePayload.analysis_porque = parsedAnalysis.analisis_5w.porque;
      }
      if (parsedAnalysis?.resumen) {
        updatePayload.summary = parsedAnalysis.resumen;
        updatePayload.analysis_summary = parsedAnalysis.resumen;
      }
      if (parsedAnalysis?.categoria) {
        updatePayload.analysis_category = parsedAnalysis.categoria;
      }
      if (parsedAnalysis?.palabras_clave) {
        updatePayload.analysis_keywords = parsedAnalysis.palabras_clave;
        updatePayload.keywords = parsedAnalysis.palabras_clave;
      }
      if (parsedAnalysis?.relevancia_clientes) {
        updatePayload.analysis_client_relevance = parsedAnalysis.relevancia_clientes;
        const clientNames = parsedAnalysis.relevancia_clientes
          .filter((c: any) => c.nivel_relevancia === 'alto' || c.nivel_relevancia === 'medio')
          .map((c: any) => c.cliente);
        if (clientNames.length > 0) updatePayload.relevant_clients = clientNames;
      }
      if (parsedAnalysis?.alertas) {
        updatePayload.analysis_alerts = parsedAnalysis.alertas;
      }

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
        analysis: parsedAnalysis,
        provider_used: providerUsed,
        fallback_reason: fallbackReason,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[qwen-tv][${requestId}] Fatal error:`, errorMessage);

    // Categorize failure for frontend
    let failureStatus = 'failed:runtime';
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      failureStatus = 'failed:qwen_rate_limit';
    } else if (errorMessage.includes('not found') || errorMessage.includes('Incomplete upload')) {
      failureStatus = 'failed:qwen_chunk_input';
    } else if (errorMessage.includes('exceeded the maximum')) {
      failureStatus = 'failed:supabase_storage_limit';
    } else if (errorMessage.includes('AssemblyAI')) {
      failureStatus = 'failed:assemblyai_error';
    } else if (errorMessage.includes('timed out')) {
      failureStatus = 'failed:timeout';
    }

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
