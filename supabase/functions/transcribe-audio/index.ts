// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// How long the HTTP request waits for the job before handing off to the
// background task. Short files still return the full transcript inline (legacy
// behaviour), long files return a job id the client polls instead.
const INLINE_WAIT_MS = 20_000;

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 200; // ~10 minutes, background task is not bound by the request

interface JobResult {
  text: string;
  transcriptId: string;
  utterances: any[];
  audioDuration?: number;
  confidence?: number;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Writes a terminal status onto the job row. Never throws: it is called from
 * `finally`, and a failure here must not mask the original error.
 */
async function writeTerminalStatus(
  supabase: any,
  jobId: string,
  status: string,
  errorMessage?: string,
) {
  try {
    const { error } = await supabase
      .from('radio_transcriptions')
      .update({
        status,
        progress: status === 'completed' ? 100 : 0,
        error_message: errorMessage ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error(`[transcribe-audio][${jobId}] Failed to write terminal status "${status}":`, error);
    } else {
      console.log(`[transcribe-audio][${jobId}] Terminal status written: ${status}`);
    }
  } catch (e) {
    console.error(`[transcribe-audio][${jobId}] Terminal status write threw:`, e);
  }
}

async function updateProgress(supabase: any, jobId: string, progress: number) {
  try {
    await supabase
      .from('radio_transcriptions')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  } catch (e) {
    // Progress is cosmetic; never fail the job over it.
    console.warn(`[transcribe-audio][${jobId}] Progress update failed:`, e);
  }
}

/**
 * The whole transcription job. Always writes a terminal status before it
 * resolves or rejects, so a row can never be left hanging.
 */
async function runTranscriptionJob(
  supabase: any,
  jobId: string,
  assemblyKey: string,
  buffer: ArrayBuffer,
): Promise<JobResult> {
  let terminalStatus = 'failed';
  let terminalError: string | undefined;
  let succeeded = false;

  try {
    // 1. Upload to AssemblyAI
    console.log(`[transcribe-audio][${jobId}] Uploading audio to AssemblyAI...`);
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': assemblyKey,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      terminalStatus = 'failed:assemblyai_error';
      throw new Error(`No se pudo subir el audio al servicio de transcripción: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    await updateProgress(supabase, jobId, 25);

    // 2. Start transcription
    console.log(`[transcribe-audio][${jobId}] Starting AssemblyAI transcription...`);
    const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadResult.upload_url,
        language_code: 'es',
        speech_models: ['universal-2'],
        speaker_labels: true,
        punctuate: true,
        format_text: true,
        entity_detection: true,
      }),
    });

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      terminalStatus = 'failed:assemblyai_error';
      throw new Error(`No se pudo iniciar la transcripción: ${errorText}`);
    }

    const transcribeResult = await transcribeResponse.json();
    const transcriptId = transcribeResult.id;
    console.log(`[transcribe-audio][${jobId}] AssemblyAI job created: ${transcriptId}`);

    // 3. Poll for completion
    let transcript: any;
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { 'Authorization': assemblyKey } },
      );

      if (!pollingResponse.ok) {
        const errorText = await pollingResponse.text();
        terminalStatus = 'failed:assemblyai_error';
        throw new Error(`No se pudo verificar el estado de la transcripción: ${errorText}`);
      }

      transcript = await pollingResponse.json();

      if (transcript.status === 'completed') {
        console.log(`[transcribe-audio][${jobId}] Transcription completed after ${attempt} poll(s)`);
        break;
      }

      if (transcript.status === 'error') {
        terminalStatus = 'failed:assemblyai_error';
        throw new Error(`La transcripción falló: ${transcript.error}`);
      }

      // 25% -> 85% across the polling window
      if (attempt % 5 === 0) {
        await updateProgress(supabase, jobId, Math.min(85, 25 + attempt * 2));
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    if (!transcript || transcript.status !== 'completed') {
      terminalStatus = 'failed:timeout';
      throw new Error('La transcripción excedió el tiempo máximo de espera.');
    }

    // 4. Reject empty results instead of saving a blank transcript
    const text = typeof transcript.text === 'string' ? transcript.text.trim() : '';
    if (!text) {
      terminalStatus = 'failed:empty_transcript';
      throw new Error('El servicio devolvió una transcripción vacía. Verifique que el audio contenga voz.');
    }

    await updateProgress(supabase, jobId, 90);

    // 5. Persist. A database failure here is a hard failure, never swallowed.
    console.log(`[transcribe-audio][${jobId}] Saving transcription to database...`);
    const { error: updateError } = await supabase
      .from('radio_transcriptions')
      .update({
        transcription_text: text,
        analysis_result: {
          entities: transcript.entities,
          content_safety: transcript.content_safety_labels,
          topics: transcript.iab_categories_result,
          utterances: transcript.utterances,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      terminalStatus = 'failed:db_error';
      throw new Error(`No se pudo guardar la transcripción: ${updateError.message}`);
    }

    const utterances = Array.isArray(transcript.utterances)
      ? transcript.utterances.map((u: any) => ({
          text: u.text,
          speaker: u.speaker,
          start: u.start,
          end: u.end,
          confidence: u.confidence,
        }))
      : [];

    succeeded = true;
    terminalStatus = 'completed';

    return {
      text,
      transcriptId,
      utterances,
      audioDuration: transcript.audio_duration,
      confidence: transcript.confidence,
    };
  } catch (error) {
    terminalError = error instanceof Error ? error.message : String(error);
    console.error(`[transcribe-audio][${jobId}] Job failed (${terminalStatus}):`, terminalError);
    throw error;
  } finally {
    // Guarantees the row never stays at "processing".
    await writeTerminalStatus(
      supabase,
      jobId,
      succeeded ? 'completed' : terminalStatus,
      succeeded ? undefined : terminalError,
    );
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any = null;
  let jobId: string | null = null;

  try {
    console.log('Starting transcription process...');

    const formData = await req.formData();
    const fileEntry = formData.get('file');
    const userId = formData.get('userId');

    if (!fileEntry || typeof fileEntry === 'string') {
      throw new Error('File is missing from request');
    }

    const file = fileEntry as File;

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
      throw new Error('Invalid userId: must be a UUID');
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error('File buffer is empty');
    }

    console.log('File validation passed:', {
      name: file.name,
      type: file.type,
      size: file.size,
      userId,
    });

    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseKey);

    // Create the job row up front so the work is always trackable, even if this
    // request dies. A failure to create it is fatal: there would be nothing to
    // report progress on.
    const { data: jobRow, error: insertError } = await supabase
      .from('radio_transcriptions')
      .insert({
        user_id: userId,
        emisora: 'default',
        programa: 'default',
        horario: new Date().toISOString(),
        status: 'processing',
        progress: 5,
      })
      .select('id')
      .single();

    if (insertError || !jobRow?.id) {
      console.error('Failed to create transcription job row:', insertError);
      throw new Error(
        `No se pudo crear el trabajo de transcripción: ${insertError?.message ?? 'sin id'}`,
      );
    }

    jobId = jobRow.id as string;
    console.log(`[transcribe-audio][${jobId}] Job row created, starting work`);

    // Start the job. It keeps running in the background if the request window
    // closes first.
    const work = runTranscriptionJob(supabase, jobId, assemblyKey, buffer);

    // Prevent an unhandled rejection when the request has already returned.
    const guarded = work.then(
      (result) => ({ ok: true as const, result }),
      (error) => ({ ok: false as const, error }),
    );

    const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
    if (typeof waitUntil === 'function') {
      waitUntil.call((globalThis as any).EdgeRuntime, guarded);
    }

    // Give short files the chance to finish inside the request, so existing
    // clients keep receiving the full transcript exactly as before.
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), INLINE_WAIT_MS));
    const settled = await Promise.race([guarded, timeout]);

    if (settled && settled.ok) {
      const { result } = settled;
      return jsonResponse({
        success: true,
        status: 'completed',
        text: result.text,
        transcript_id: result.transcriptId,
        transcription_id: jobId,
        job_id: jobId,
        utterances: result.utterances,
        metadata: {
          audio_duration: result.audioDuration,
          confidence: result.confidence,
        },
      });
    }

    if (settled && !settled.ok) {
      const message = settled.error instanceof Error
        ? settled.error.message
        : String(settled.error);
      return jsonResponse({ success: false, status: 'failed', job_id: jobId, error: message }, 400);
    }

    // Still running: hand the client a job id to follow.
    console.log(`[transcribe-audio][${jobId}] Still running after ${INLINE_WAIT_MS}ms, returning job id`);
    return jsonResponse(
      {
        success: true,
        status: 'processing',
        job_id: jobId,
        transcription_id: jobId,
        message: 'La transcripción continúa en segundo plano.',
      },
      202,
    );
  } catch (error) {
    console.error('Error in transcribe-audio function:', error);

    if (supabase && jobId) {
      await writeTerminalStatus(
        supabase,
        jobId,
        'failed',
        error instanceof Error ? error.message : String(error),
      );
    }

    return jsonResponse(
      {
        success: false,
        status: 'failed',
        job_id: jobId,
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }
});
