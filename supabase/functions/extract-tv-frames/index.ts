/**
 * extract-tv-frames
 *
 * Extracts low-fps JPG keyframes from a TV video using CloudConvert's
 * ffmpeg `thumbnails` operation, then uploads them to the `videos` bucket
 * under `tv-frames/<transcriptionId>/`.
 *
 * Used by process-tv-with-qwen to feed Qwen-VL with on-screen graphics
 * (lower-thirds, chyrons, network logos) so we can OCR real speaker names.
 *
 * Input: { videoPath, transcriptionId, isChunked?: boolean, sessionId?: string }
 * Output: { frames: [{ url, ts_seconds }], framesExtracted, source }
 *
 * For chunked uploads we pull the FIRST chunk only (15 MB ≈ 30-60s of
 * footage) — enough to OCR opening lower-thirds without round-tripping
 * the entire video to CloudConvert.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CC_API = 'https://api.cloudconvert.com/v2';

/** Extracts 1 frame every N seconds via CloudConvert ffmpeg thumbnails. */
async function extractFramesViaCloudConvert(
  videoSourceUrl: string,
  apiKey: string,
  requestId: string,
  fps: number = 0.2,           // 1 frame every 5 seconds
  maxFrames: number = 120,
  width: number = 720,
  height: number = 480,
): Promise<{ frameUrls: string[]; durationSeconds?: number }> {
  // CloudConvert "thumbnail" task with ffmpeg can output multiple frames
  // by using fps filter and frame count cap.
  const createJob = await fetch(`${CC_API}/jobs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tasks: {
        'import-1': { operation: 'import/url', url: videoSourceUrl },
        'thumb-1': {
          operation: 'thumbnail',
          input: 'import-1',
          input_format: 'mp4',
          output_format: 'jpg',
          engine: 'ffmpeg',
          width,
          height,
          fit: 'scale',
          count: maxFrames,
          // ffmpeg-specific: spread across the whole video
          timestamp: 'all',
        },
        'export-1': { operation: 'export/url', input: 'thumb-1' },
      },
      tag: `tv-frames-${requestId}`,
    }),
  });

  if (!createJob.ok) {
    const errText = await createJob.text();
    throw new Error(`CloudConvert createJob failed (${createJob.status}): ${errText}`);
  }
  const jobData = await createJob.json();
  const jobId = jobData?.data?.id;
  if (!jobId) throw new Error('CloudConvert returned no job id');

  // Poll
  const maxWaitMs = 5 * 60 * 1000;
  const start = Date.now();
  let status: any = null;
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000));
    const r = await fetch(`${CC_API}/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    status = await r.json();
    const s = status?.data?.status;
    if (s === 'finished') break;
    if (s === 'error') {
      const taskErrors = (status?.data?.tasks || []).filter((t: any) => t.status === 'error')
        .map((t: any) => t.message).join(' | ');
      throw new Error(`CloudConvert job error: ${taskErrors || 'unknown'}`);
    }
  }
  if (status?.data?.status !== 'finished') {
    throw new Error('CloudConvert job timed out after 5 minutes');
  }

  const exportTask = status.data.tasks.find((t: any) => t.operation === 'export/url');
  const files = exportTask?.result?.files || [];
  const frameUrls: string[] = files.map((f: any) => f.url).filter(Boolean);
  if (frameUrls.length === 0) throw new Error('CloudConvert produced no frame URLs');
  return { frameUrls };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const requestId = `etf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ccKey = Deno.env.get('CLOUDCONVERT_API_KEY');
    if (!ccKey) throw new Error('CLOUDCONVERT_API_KEY no configurada');

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const {
      videoPath,
      transcriptionId,
      isChunked = false,
      sessionId,
    } = body as { videoPath?: string; transcriptionId: string; isChunked?: boolean; sessionId?: string };

    if (!transcriptionId) throw new Error('transcriptionId requerido');

    // Resolve a public/signed video source URL for CloudConvert to import
    let sourceUrl: string;
    let sourceLabel: string;

    if (isChunked && sessionId) {
      // Use the first chunk only — gives early lower-thirds without
      // re-uploading hundreds of MB.
      const chunkPath = `chunks/${sessionId}/chunk_0000`;
      const { data: signed, error: sErr } = await supabase
        .storage.from('video').createSignedUrl(chunkPath, 3600);
      if (sErr || !signed?.signedUrl) {
        throw new Error(`No se pudo firmar primer chunk: ${sErr?.message || 'unknown'}`);
      }
      sourceUrl = signed.signedUrl;
      sourceLabel = `chunked/${sessionId}/chunk_0000`;
    } else if (videoPath) {
      const { data: signed, error: sErr } = await supabase
        .storage.from('video').createSignedUrl(videoPath, 3600);
      if (sErr || !signed?.signedUrl) {
        throw new Error(`No se pudo firmar videoPath: ${sErr?.message || 'unknown'}`);
      }
      sourceUrl = signed.signedUrl;
      sourceLabel = videoPath;
    } else {
      throw new Error('videoPath o sessionId requerido');
    }

    console.log(`[extract-tv-frames][${requestId}] source=${sourceLabel}`);

    const { frameUrls } = await extractFramesViaCloudConvert(sourceUrl, ccKey, requestId);
    console.log(`[extract-tv-frames][${requestId}] CloudConvert returned ${frameUrls.length} frames`);

    // Download each frame and upload to videos bucket under tv-frames/<id>/
    const frames: { url: string; ts_seconds: number; index: number }[] = [];
    const fpsExtracted = 0.2; // 1 frame every 5 seconds
    for (let i = 0; i < frameUrls.length; i++) {
      try {
        const r = await fetch(frameUrls[i]);
        if (!r.ok) {
          console.warn(`[extract-tv-frames][${requestId}] frame ${i} download failed: ${r.status}`);
          continue;
        }
        const buf = new Uint8Array(await r.arrayBuffer());
        const storagePath = `tv-frames/${transcriptionId}/frame_${String(i).padStart(4, '0')}.jpg`;
        const { error: upErr } = await supabase
          .storage.from('videos').upload(storagePath, buf, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        if (upErr) {
          console.warn(`[extract-tv-frames][${requestId}] frame ${i} upload failed:`, upErr.message);
          continue;
        }
        const { data: pub } = supabase.storage.from('videos').getPublicUrl(storagePath);
        frames.push({
          url: pub.publicUrl,
          ts_seconds: Math.round((i / fpsExtracted) * 10) / 10,
          index: i,
        });
      } catch (e) {
        console.warn(`[extract-tv-frames][${requestId}] frame ${i} error:`, (e as Error).message);
      }
    }

    console.log(`[extract-tv-frames][${requestId}] Stored ${frames.length} frames in storage`);

    return new Response(
      JSON.stringify({
        success: true,
        frames,
        framesExtracted: frames.length,
        source: sourceLabel,
        fps: fpsExtracted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[extract-tv-frames][${requestId}] Error:`, msg);
    return new Response(
      JSON.stringify({ success: false, error: msg, frames: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});