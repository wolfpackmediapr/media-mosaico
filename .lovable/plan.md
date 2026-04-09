

## Fix: Add Visual Speaker Identification for Large Files

### Problem
For **small files**, Qwen receives the actual video (`video_url`) and the prompt explicitly instructs it to read lower thirds, chyrons, on-screen names, and visual cues (lines 38-46). This works perfectly.

For **large/chunked files**, the speaker ID step (lines 634-674) sends **only text** to Qwen — no video frames at all. So it can only guess from dialogue context, missing all the visual identifiers (lower thirds, name banners, chyrons, logos) that are critical for accurate speaker naming.

### Fix

**File**: `supabase/functions/process-tv-with-qwen/index.ts` (lines 634-674)

Replace the text-only speaker ID call with a **vision-enabled** call that sends the first video chunk alongside the transcription text:

1. Generate a signed URL for the first chunk: `chunks/${sessionId}/chunk_0000` (this is the first ~15MB of video, containing the opening where lower thirds and introductions appear)
2. Send it to Qwen as a `video_url` content part alongside the text prompt
3. Enhance the speaker ID prompt to include the same visual identification instructions from the small-file prompt (lower thirds, chyrons, name cards, known PR personalities, clothing descriptors)

```typescript
// Generate signed URL for first chunk (contains intros & lower thirds)
const firstChunkPath = `chunks/${sessionId}/chunk_0000`;
const { data: chunkUrlData } = await supabaseClient
  .storage.from('video')
  .createSignedUrl(firstChunkPath, 600);

const speakerIdPrompt = `Analiza este video y la transcripción para identificar cada hablante.

IDENTIFICACIÓN VISUAL (PRIORIDAD):
✓ LEE los "lower thirds" (subtítulos con nombres en la parte inferior de la pantalla)
✓ LEE las tarjetas gráficas con nombres que aparezcan en pantalla
✓ IDENTIFICA logos de TV y canales para contexto
✓ RECONOCE personalidades conocidas de noticias de Puerto Rico
✓ DISTINGUE por vestimenta, ubicación (estudio vs campo), rol visible

IDENTIFICACIÓN POR DIÁLOGO:
- Auto-presentaciones ("Les saluda...", "Soy...")
- Menciones por otros ("pasamos con Tom Bryant")
- Indicadores de rol ("reportera", "doctor", "presentador")

Si NO puedes identificar por nombre, usa descriptor visual:
"Presentador principal", "Mujer con traje rojo", "Reportero en campo", etc.
NUNCA devuelvas solo la letra.

Responde ÚNICAMENTE con JSON: {"A": "Nombre - Rol", "B": "Descriptor - Rol"}

TRANSCRIPCIÓN:
${transcriptionText.substring(0, 15000)}`;

const speakerIdMessages = [{
  role: 'user',
  content: [
    ...(chunkUrlData?.signedUrl
      ? [{ type: 'video_url', video_url: { url: chunkUrlData.signedUrl } }]
      : []),
    { type: 'text', text: speakerIdPrompt },
  ],
}];
```

If the signed URL fails (unlikely), it falls back gracefully to text-only identification — same as current behavior.

Also increase `max_tokens` from 1024 to 2048 for the speaker ID call to handle more speakers.

### Scope
- One file, ~40 lines in the speaker ID section (lines 634-674)
- Redeploy edge function
- No frontend, radio, UI, or DB changes
- Small file path unchanged (already has full vision)
- Analysis prompt unchanged

### Expected result
Large file transcriptions will show named speakers like `SPEAKER A (Silverio Pérez - Presentador):` instead of just `SPEAKER A:`, identified from lower thirds, chyrons, and visual cues in the opening segment of the video.

