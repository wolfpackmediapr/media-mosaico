import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { buildTvAnalysisPrompt } from '../_shared/tvAnalysisPrompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const TEXT_MODEL = 'qwen-plus';
const TEXT_MODEL_FALLBACK = 'qwen-turbo';
const MAX_RETRIES = 3;

// Canonical TV prompt is centralized in _shared/tvAnalysisPrompt.ts so that
// process-tv-with-qwen, analyze-tv-stored and Gemini fallback all emit the
// same [TIPO DE CONTENIDO: ...] + [NOTICIA N] structure the UI renders as
// blue/yellow color-coded cards.

// ── Qwen streaming call (mirror) ──────────────────────────────────────────────
async function callQwenStreaming(
  apiKey: string,
  model: string,
  messages: any[],
  requestId: string,
  stage: string,
  maxTokens: number = 16384,
): Promise<{ success: boolean; data?: string; error?: string }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[analyze-tv-stored][${requestId}] ${stage} attempt ${attempt}/${MAX_RETRIES} model=${model}`);
    try {
      const response = await fetch(QWEN_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, messages, modalities: ['text'],
          stream: true, stream_options: { include_usage: true },
          temperature: 0.1, max_tokens: maxTokens,
        }),
      });

      if (response.status === 429) {
        const backoff = Math.min(5000 * 2 ** (attempt - 1), 30000);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      if (response.status === 503 || response.status === 500) {
        await new Promise(r => setTimeout(r, 3000 * attempt));
        continue;
      }
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorText.slice(0, 300)}` };
      }

      const reader = response.body?.getReader();
      if (!reader) return { success: false, error: 'No response body reader' };

      const decoder = new TextDecoder();
      let collectedText = '';
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nlIdx: number;
        while ((nlIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) collectedText += delta;
          } catch { /* partial */ }
        }
      }

      if (!collectedText) return { success: false, error: 'Empty stream response' };
      console.log(`[analyze-tv-stored][${requestId}] ${stage} success chars=${collectedText.length}`);
      return { success: true, data: collectedText };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_RETRIES) return { success: false, error: `All retries failed: ${msg}` };
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  return { success: false, error: 'Max retries exhausted' };
}

// ── Field extraction (mirror of process-tv-with-qwen.extractAnalysisFieldsFromText) ──
function extractAnalysisFieldsFromText(text: string, payload: any): void {
  if (!text || text.startsWith('Error en análisis')) return;

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

  const resumenMatch = text.match(/(?:Resumen|RESUMEN)[^:]*:?\s*\n([\s\S]*?)(?=\n(?:\d+\.|Temas|TEMAS|Tono|TONO|Categor|CATEGOR|An[aá]lisis|ANÁLISIS|Palabras|PALABRAS|Puntuaci|PUNTUACI|Alertas|ALERTAS|\[TIPO))/i);
  if (resumenMatch) {
    const summary = resumenMatch[1].trim().substring(0, 2000);
    payload.summary = summary;
    payload.analysis_summary = summary;
  }

  const catMatch = text.match(/Categor[ií]a(?:s)?\s+(?:principal|aplicable)[^:]*:\s*([^\n]+)/i);
  if (catMatch) payload.analysis_category = catMatch[1].trim().replace(/^\*\*|\*\*$/g, '');

  const kwMatch = text.match(/Palabras\s+clave[^:]*:\s*([^\n]+)/i);
  if (kwMatch) {
    const kws = kwMatch[1].split(/[,;]/).map((k: string) => k.trim().replace(/^[-•]\s*/, '')).filter(Boolean);
    if (kws.length > 0) {
      payload.analysis_keywords = kws;
      payload.keywords = kws;
    }
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const requestId = `ats_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const qwenApiKey = Deno.env.get('QWEN_API_KEY');
    if (!qwenApiKey) throw new Error('QWEN_API_KEY no configurada');

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const transcriptionId: string | undefined = body.transcriptionId || body.transcriptId;
    if (!transcriptionId) {
      return new Response(JSON.stringify({ error: 'transcriptionId requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load transcription text + categories/clients
    const { data: row, error: rowErr } = await supabase
      .from('tv_transcriptions')
      .select('id, transcription_text, status')
      .eq('id', transcriptionId)
      .single();
    if (rowErr || !row) throw new Error(`Transcripción no encontrada: ${rowErr?.message || transcriptionId}`);
    const transcriptionText: string = row.transcription_text || body.transcriptionText || '';
    if (!transcriptionText || transcriptionText.length < 20) {
      throw new Error('La transcripción está vacía; no se puede analizar.');
    }

    let categories: string[] = Array.isArray(body.categories) ? body.categories : [];
    let clients: any[] = Array.isArray(body.clients) ? body.clients : [];

    if (categories.length === 0) {
      const { data: cats } = await supabase.from('categories').select('name_es, name').limit(50);
      categories = (cats || []).map((c: any) => c.name_es || c.name).filter(Boolean);
    }
    if (clients.length === 0) {
      const { data: cls } = await supabase.from('clients').select('name, keywords').limit(50);
      clients = (cls || []).map((c: any) => ({ name: c.name, keywords: c.keywords || [] })).filter((c: any) => c.name);
    }

    console.log(`[analyze-tv-stored][${requestId}] Analyzing transcript ${transcriptionId} chars=${transcriptionText.length} cats=${categories.length} clients=${clients.length}`);

    const prompt = buildTvAnalysisPrompt(categories, clients, transcriptionText);
    const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];

    let result = await callQwenStreaming(qwenApiKey, TEXT_MODEL, messages, requestId, 'analysis', 16384);
    if (!result.success) {
      console.warn(`[analyze-tv-stored][${requestId}] Primary failed, fallback`);
      result = await callQwenStreaming(qwenApiKey, TEXT_MODEL_FALLBACK, messages, requestId, 'analysis-fallback', 16384);
    }

    if (!result.success) {
      await supabase.from('tv_transcriptions').update({
        provider_fallback_reason: `Analysis failed: ${result.error}`.substring(0, 500),
      }).eq('id', transcriptionId);
      return new Response(JSON.stringify({ error: result.error, success: false }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analysisText = result.data!;
    const updatePayload: any = {
      full_analysis: analysisText,
      status: 'completed',
      progress: 100,
      updated_at: new Date().toISOString(),
    };
    extractAnalysisFieldsFromText(analysisText, updatePayload);

    const { error: upErr } = await supabase
      .from('tv_transcriptions')
      .update(updatePayload)
      .eq('id', transcriptionId);
    if (upErr) throw new Error(`DB update failed: ${upErr.message}`);

    console.log(`[analyze-tv-stored][${requestId}] Done, chars=${analysisText.length}`);
    return new Response(JSON.stringify({ success: true, chars: analysisText.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[analyze-tv-stored][${requestId}] Error:`, msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});