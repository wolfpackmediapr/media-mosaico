
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

// ─── Qwen API Call with Retry ──────────────────────────────────────────

async function callQwen(
  apiKey: string,
  model: string,
  messages: any[],
  requestId: string,
  stage: string
): Promise<{ success: boolean; data?: any; error?: string; statusCode?: number }> {
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

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        console.error(`[qwen-tv][${requestId}] ${stage} no choices in response`);
        return { success: false, error: 'No choices in Qwen response' };
      }

      const content = data.choices[0].message?.content;
      if (!content) {
        console.error(`[qwen-tv][${requestId}] ${stage} empty content in response`);
        return { success: false, error: 'Empty content in Qwen response' };
      }

      console.log(`[qwen-tv][${requestId}] ${stage} success on attempt ${attempt}, tokens: input=${data.usage?.prompt_tokens}, output=${data.usage?.completion_tokens}`);
      return { success: true, data: content };

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
      transcriptId,
      categories = [],
      clients = [],
    } = body;

    if (!videoPath) throw new Error('videoPath es requerido');

    console.log(`[qwen-tv][${requestId}] Processing:`, {
      videoPath,
      transcriptId,
      categoriesCount: categories.length,
      clientsCount: clients.length,
    });

    // ── Generate signed URL ──
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient
      .storage
      .from('video')
      .createSignedUrl(videoPath, 3600); // 1 hour

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(`[qwen-tv][${requestId}] Signed URL error:`, signedUrlError);
      throw new Error('No se pudo generar URL firmada para el video');
    }

    const videoUrl = signedUrlData.signedUrl;
    console.log(`[qwen-tv][${requestId}] Signed URL generated successfully`);

    // ── Update status to processing ──
    if (transcriptId) {
      await supabaseClient
        .from('tv_transcriptions')
        .update({ status: 'processing', progress: 10, provider_used: 'qwen-primary' })
        .eq('id', transcriptId);
    }

    // ── Stage 1: Transcription ──
    console.log(`[qwen-tv][${requestId}] Starting Stage 1: Transcription`);

    let providerUsed = 'qwen-primary';
    let fallbackReason: string | null = null;

    const transcriptionMessages = [
      {
        role: 'user',
        content: [
          { type: 'video_url', video_url: { url: videoUrl } },
          { type: 'text', text: buildTranscriptionPrompt() },
        ],
      },
    ];

    let transcriptionResult = await callQwen(qwenApiKey, PRIMARY_MODEL, transcriptionMessages, requestId, 'transcription');

    // Fallback to flash model
    if (!transcriptionResult.success) {
      console.warn(`[qwen-tv][${requestId}] Primary model failed for transcription, falling back to ${FALLBACK_MODEL}`);
      fallbackReason = `Transcription: ${transcriptionResult.error}`;
      providerUsed = 'qwen-fallback';
      transcriptionResult = await callQwen(qwenApiKey, FALLBACK_MODEL, transcriptionMessages, requestId, 'transcription-fallback');
    }

    if (!transcriptionResult.success) {
      throw new Error(`Transcripción falló con ambos modelos: ${transcriptionResult.error}`);
    }

    const transcriptionText = transcriptionResult.data;
    console.log(`[qwen-tv][${requestId}] Transcription complete, length: ${transcriptionText.length} chars`);

    // Update progress
    if (transcriptId) {
      await supabaseClient
        .from('tv_transcriptions')
        .update({ progress: 50, transcription_text: transcriptionText })
        .eq('id', transcriptId);
    }

    // ── Stage 2: Analysis ──
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
    let analysisResult = await callQwen(qwenApiKey, analysisModel, analysisMessages, requestId, 'analysis');

    // Fallback for analysis too
    if (!analysisResult.success && analysisModel === PRIMARY_MODEL) {
      console.warn(`[qwen-tv][${requestId}] Primary model failed for analysis, falling back`);
      if (!fallbackReason) fallbackReason = `Analysis: ${analysisResult.error}`;
      providerUsed = 'qwen-fallback';
      analysisResult = await callQwen(qwenApiKey, FALLBACK_MODEL, analysisMessages, requestId, 'analysis-fallback');
    }

    let parsedAnalysis: any = null;
    if (analysisResult.success) {
      try {
        // Try to extract JSON from response
        const rawText = analysisResult.data;
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

      // Map 5W analysis fields if parsed
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

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
