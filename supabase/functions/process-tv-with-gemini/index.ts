import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TV Prompt Builder Function
function constructTvPrompt(
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
INSTRUCCIÓN CRÍTICA: Debes responder ÚNICAMENTE en español y con la estructura JSON exacta que se especifica a continuación. NO uses nombres de campos en inglés.

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

RESPONDE ÚNICAMENTE EN ESPAÑOL CON ESTA ESTRUCTURA JSON EXACTA (usa estos nombres de campo exactamente):
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

IMPORTANTE: NO uses "analysis", "keywords", "summary" ni otros campos en inglés. Usa EXACTAMENTE los nombres de campo en español mostrados arriba.

${contextText ? `Contexto adicional: ${contextText}` : ''}
`;
}

// Utility function to categorize errors
function categorizeError(message: string): string {
  if (message.includes('memory') || message.includes('heap')) {
    return 'Error de memoria: El archivo es demasiado grande para procesar.';
  } else if (message.includes('timeout')) {
    return 'Tiempo de espera agotado: La operación tardó demasiado en completarse.';
  } else if (message.includes('file size limit')) {
    return 'Límite de tamaño de archivo excedido.';
  } else {
    return 'Error desconocido: Por favor, inténtalo de nuevo más tarde.';
  }
}

// Function to upload video to Gemini File API
async function uploadVideoToGemini(videoBlob: Blob, fileName: string): Promise<{ uri: string; mimeType: string }> {
  console.log('[gemini-unified] Uploading video to Gemini...', fileName);
  
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('Google Gemini API key not configured');
  }

  try {
    // First, start resumable upload
    const initResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': videoBlob.size.toString(),
          'X-Goog-Upload-Header-Content-Type': 'video/mp4',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: {
            display_name: fileName
          }
        })
      }
    );

    if (!initResponse.ok) {
      throw new Error(`Failed to initialize upload: ${initResponse.status} ${initResponse.statusText}`);
    }

    const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) {
      throw new Error('No upload URL received from Gemini');
    }

    // Upload the actual video data
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': videoBlob.size.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: videoBlob
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload video: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('[gemini-unified] Video uploaded successfully:', uploadResult.file?.name);

    // Wait for processing to complete
    const fileUri = uploadResult.file?.uri;
    if (!fileUri) {
      throw new Error('No file URI received from upload');
    }

    await waitForFileProcessing(uploadResult.file.name, geminiApiKey);

    return {
      uri: fileUri,
      mimeType: 'video/mp4'
    };
  } catch (error) {
    console.error('[gemini-unified] Video upload error:', error);
    throw new Error(`Video upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Streaming upload to Gemini File API
async function uploadVideoToGeminiStream(
  totalSize: number,
  mimeType: string,
  fileName: string,
  dataStream: ReadableStream<Uint8Array>
): Promise<{ uri: string; mimeType: string }> {
  console.log('[gemini-unified] Streaming upload to Gemini...', { fileName, totalSize, mimeType });
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('Google Gemini API key not configured');
  }
  try {
    // Initialize resumable upload
    const initResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': totalSize.toString(),
          'X-Goog-Upload-Header-Content-Type': mimeType || 'video/mp4',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: fileName } })
      }
    );
    if (!initResponse.ok) {
      throw new Error(`Failed to initialize streaming upload: ${initResponse.status} ${initResponse.statusText}`);
    }
    const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) {
      throw new Error('No upload URL received from Gemini');
    }

    // Stream the chunks to Gemini
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': totalSize.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: dataStream
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to stream video: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileUri = uploadResult.file?.uri;
    if (!fileUri) {
      throw new Error('No file URI received from upload');
    }

    await waitForFileProcessing(uploadResult.file.name, geminiApiKey);

    return { uri: fileUri, mimeType: mimeType || 'video/mp4' };
  } catch (error) {
    console.error('[gemini-unified] Streaming upload error:', error);
    throw new Error(`Streaming upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to wait for file processing by Gemini
async function waitForFileProcessing(fileName: string, apiKey: string): Promise<void> {
  console.log('[gemini-unified] Waiting for file processing...', fileName);
  
  const maxAttempts = 15; // Reduced attempts
  const baseDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Fixed the API URL - remove extra 'files/' prefix
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[gemini-unified] File not ready yet, waiting... (attempt ${attempt})`);
          await new Promise(resolve => setTimeout(resolve, baseDelay));
          continue;
        }
        throw new Error(`Failed to check file status: ${response.status}`);
      }

      const fileInfo = await response.json();
      console.log(`[gemini-unified] File status check ${attempt}:`, fileInfo.state);

      if (fileInfo.state === 'ACTIVE') {
        console.log('[gemini-unified] File processing completed successfully');
        return;
      } else if (fileInfo.state === 'FAILED') {
        throw new Error('File processing failed on Gemini side');
      }

      // File is still processing, wait before next check
      await new Promise(resolve => setTimeout(resolve, baseDelay));
      
    } catch (error) {
      console.error(`[gemini-unified] File status check attempt ${attempt} failed:`, error);
      if (attempt === maxAttempts) {
        // Continue instead of throwing to allow processing with uploaded file
        console.log('[gemini-unified] File processing timeout, continuing with analysis...');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Function to clean up Gemini file
async function cleanupGeminiFile(fileName: string): Promise<void> {
  console.log('[gemini-unified] Cleaning up Gemini file...', fileName);
  
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
  if (!geminiApiKey) {
    console.error('[gemini-unified] No API key for cleanup');
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiApiKey}`,
      {
        method: 'DELETE'
      }
    );

    if (response.ok) {
      console.log('[gemini-unified] File cleanup completed successfully');
    } else {
      console.error('[gemini-unified] File cleanup failed:', response.status);
    }
  } catch (error) {
    console.error('[gemini-unified] File cleanup error:', error);
  }
}

// Function to update database progress
async function updateDatabaseProgress(transcriptionId: string, progress: number, status: string): Promise<void> {
  console.log('[gemini-unified] Updating database progress...', {
    transcriptionId,
    progress,
    status
  });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL and service key are required');
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabaseClient
    .from('tv_transcriptions')
    .update({ progress, status })
    .eq('id', transcriptionId);

  if (error) {
    console.error('[gemini-unified] Database update error:', error);
    throw new Error(`Database update failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function generateComprehensiveAnalysis(
  transcriptText: string, 
  categories: any[], 
  clients: any[]
): Promise<string> {
  console.log('[gemini-unified] Generating comprehensive analysis...');
  
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('Google Gemini API key not configured');
  }

  // Build TV-specific Spanish prompt using the proper prompt builder
  const prompt = constructTvPrompt(
    categories.map(c => c.name),
    clients,
    '',
    !!transcriptText
  );

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('[gemini-unified] Analysis generation error:', error);
    throw new Error(`Failed to generate analysis: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to download video from Supabase storage with fallback reassembly
async function downloadVideoFromSupabase(videoPath: string, sessionId?: string): Promise<Blob> {
  console.log('[gemini-unified] Downloading video from Supabase storage...', videoPath);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials required for video download');
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data, error } = await supabaseClient.storage
      .from('video')
      .download(videoPath);

    if (error && sessionId) {
      console.log('[gemini-unified] Assembled file not found, attempting fallback reassembly...');
      
      // Try to trigger reassembly if we have session info
      const fileName = videoPath.split('/').pop() || 'video.mp4';
      
      // Get session info for reassembly
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('chunked_upload_sessions')
        .select('total_chunks, status')
        .eq('session_id', sessionId)
        .single();
      
      if (!sessionError && sessionData) {
        console.log('[gemini-unified] Found session data, triggering reassembly...');
        
        // Call reassembly function
        const reassemblyResponse = await fetch(`${supabaseUrl}/functions/v1/reassemble-chunked-video`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: sessionId,
            fileName: fileName,
            totalChunks: sessionData.total_chunks
          })
        });
        
        if (reassemblyResponse.ok) {
          console.log('[gemini-unified] Reassembly completed, retrying download...');
          
          // Retry download after reassembly
          const { data: retryData, error: retryError } = await supabaseClient.storage
            .from('video')
            .download(videoPath);
          
          if (!retryError && retryData) {
            console.log('[gemini-unified] Video downloaded successfully after reassembly:', {
              size: retryData.size,
              type: retryData.type
            });
            return retryData;
          }
        }
      }
      
      throw new Error(`Failed to download video after reassembly attempt: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (error) {
      throw new Error(`Failed to download video: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!data) {
      throw new Error('No video data received from Supabase');
    }

    console.log('[gemini-unified] Video downloaded successfully:', {
      size: data.size,
      type: data.type
    });

    return data;
  } catch (error) {
    console.error('[gemini-unified] Video download error:', error);
    throw new Error(`Video download failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to process chunked upload with Gemini
async function processChunkedUploadWithGemini(
  sessionId: string,
  displayName: string,
  transcriptionId: string | null,
  categories: any[],
  clients: any[]
): Promise<{
  success: boolean;
  transcription?: string;
  segments?: any[];
  full_analysis?: string;
  summary?: string;
  keywords?: string[];
}> {
  console.log('[gemini-unified] Processing chunked upload...', {
    sessionId,
    displayName,
    videoPath: `chunked:${displayName}`,
    categoriesCount: categories.length,
    clientsCount: clients.length
  });

  try {
    // Attempt manifest-based streaming first to avoid large reassembly
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseClient = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

    let fileInfo: { uri: string; mimeType: string } | null = null;

    if (supabaseClient) {
      const { data: manifest, error: manifestError } = await supabaseClient
        .from('video_chunk_manifests')
        .select('session_id, total_size, mime_type, chunk_order')
        .eq('session_id', sessionId)
        .single();

      if (manifestError) {
        console.error('[gemini-unified] Manifest lookup error:', manifestError);
      } else if (!manifest) {
        console.warn('[gemini-unified] No manifest found for session:', sessionId);
      }

      if (manifest && Array.isArray(manifest.chunk_order) && manifest.chunk_order.length > 0) {
        console.log('[gemini-unified] Manifest found, streaming chunks', {
          sessionId,
          chunks: (manifest.chunk_order as any[]).length,
          totalSize: manifest.total_size,
          mimeType: manifest.mime_type
        });
        // Stream chunks directly to Gemini to handle very large files without reassembly
        if (transcriptionId) {
          await updateDatabaseProgress(transcriptionId, 20, 'Streaming video to Gemini...');
        }

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for (const chunk of manifest.chunk_order as any[]) {
                const { data: chunkBlob, error: chunkErr } = await supabaseClient.storage
                  .from('video')
                  .download((chunk as any).path as string);
                if (chunkErr || !chunkBlob) {
                  throw new Error(`Failed to download chunk ${(chunk as any).index}: ${chunkErr?.message}`);
                }
                const buf = new Uint8Array(await chunkBlob.arrayBuffer());
                controller.enqueue(buf);
              }
              controller.close();
            } catch (e) {
              controller.error(e);
            }
          }
        });

        fileInfo = await uploadVideoToGeminiStream(
          manifest.total_size as number,
          (manifest.mime_type as string) || 'video/mp4',
          (displayName && displayName.length > 0 ? displayName : `${sessionId}.mp4`),
          stream
        );
        console.log('[gemini-unified] File processing completed successfully (streamed)');
      }
    }

    if (!fileInfo) {
      // Fallback: download assembled file or trigger reassembly
      if (transcriptionId) {
        await updateDatabaseProgress(transcriptionId, 10, 'Downloading video...');
      }
      const assembledFilePath = `${sessionId}/${displayName}`;
      const videoBlob = await downloadVideoFromSupabase(assembledFilePath, sessionId);
      if (transcriptionId) {
        await updateDatabaseProgress(transcriptionId, 30, 'Uploading to Gemini...');
      }
      fileInfo = await uploadVideoToGemini(videoBlob, displayName);
      console.log('[gemini-unified] File processing completed successfully');
    }

    // Update progress
    if (transcriptionId) {
      await updateDatabaseProgress(transcriptionId, 50, 'Generating comprehensive analysis...');
    }

    // Generate analysis with retry logic
    let analysisResult = null;
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[gemini-unified] Analysis attempt ${attempt}/${maxAttempts}`);
        
        const analysisResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${Deno.env.get('GOOGLE_GEMINI_API_KEY')}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      fileData: {
                        mimeType: fileInfo.mimeType,
                        fileUri: fileInfo.uri
                      }
                    },
                    {
                      text: buildTvAnalysisPrompt(categories, clients)
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.1,
                topK: 32,
                topP: 0.8,
                maxOutputTokens: 8192
                // Note: No responseMimeType - allow flexible [TIPO DE CONTENIDO:] format
              }
            })
          }
        );

        if (!analysisResponse.ok) {
          const errorText = await analysisResponse.text();
          console.error(`[gemini-unified] API Response Error:`, {
            status: analysisResponse.status,
            statusText: analysisResponse.statusText,
            body: errorText,
            attempt: attempt,
            mimeType: fileInfo.mimeType
          });
          
          // MP4-specific error handling for 400 errors
          if (analysisResponse.status === 400 && fileInfo.mimeType.includes('mp4')) {
            console.log(`[gemini-unified] MP4 format rejected by Gemini (attempt ${attempt})`);
            if (attempt === maxAttempts) {
              throw new Error(`MP4 format not supported by Gemini API. Status: ${analysisResponse.status}. Consider converting to MOV format.`);
            }
          }
          
          throw new Error(`Gemini API error: ${analysisResponse.status} - ${errorText}`);
        }

        const analysisData = await analysisResponse.json();
        if (!analysisData.candidates || analysisData.candidates.length === 0) {
          throw new Error('No analysis response from Gemini');
        }

        analysisResult = analysisData.candidates[0].content.parts[0].text;
        break;
      } catch (error) {
        console.error(`[gemini-unified] Analysis attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }

    console.log('[gemini-unified] Analysis completed successfully');

    // Clean up file
    await cleanupGeminiFile(displayName);
    console.log('[gemini-unified] File cleanup completed successfully');

    return {
      success: true,
      transcription: extractTranscriptionFromAnalysis(analysisResult),
      segments: extractSegmentsFromAnalysis(analysisResult),
      full_analysis: analysisResult,
      summary: extractSummaryFromAnalysis(analysisResult),
      keywords: extractKeywordsFromAnalysis(analysisResult)
    };

  } catch (error) {
    console.error('[gemini-unified] Chunked upload processing error:', error);
    throw new Error(`Chunked upload processing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Function to process assembled video with Gemini
async function processAssembledVideoWithGemini(
  videoPath: string,
  transcriptionId: string | null,
  categories: any[],
  clients: any[]
): Promise<{
  success: boolean;
  transcription?: string;
  segments?: any[];
  full_analysis?: string;
  summary?: string;
  keywords?: string[];
}> {
  console.log('[gemini-unified] Processing assembled video...', {
    videoPath,
    categoriesCount: categories.length,
    clientsCount: clients.length
  });

  try {
    // Update progress
    if (transcriptionId) {
      await updateDatabaseProgress(transcriptionId, 10, 'Downloading video...');
    }

     // Download video from Supabase storage (use appropriate bucket for compressed videos)
     const isCompressed = videoPath.includes('_compressed.');
     const bucket = isCompressed ? 'media' : 'video';
     const sessionId = videoPath.includes('/') ? videoPath.split('/')[0] : undefined;
     
     const supabaseUrl = Deno.env.get('SUPABASE_URL');
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
     const supabaseClient = createClient(supabaseUrl!, supabaseServiceKey!);
     
     const { data: videoData, error: downloadError } = await supabaseClient
       .storage
       .from(bucket)
       .download(videoPath);

     if (downloadError) {
       throw new Error(`Failed to download video: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
     }

     const videoBlob = new Blob([videoData], { type: 'video/mp4' });
    
    // Update progress
    if (transcriptionId) {
      await updateDatabaseProgress(transcriptionId, 30, 'Uploading to Gemini...');
    }

    // Upload to Gemini and wait for processing
    const fileInfo = await uploadVideoToGemini(videoBlob, videoPath.split('/').pop() || 'video.mp4');
    console.log('[gemini-unified] File processing completed successfully');

    // Update progress
    if (transcriptionId) {
      await updateDatabaseProgress(transcriptionId, 50, 'Generating comprehensive analysis...');
    }

    // Generate analysis with retry logic
    let analysisResult = null;
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[gemini-unified] Analysis attempt ${attempt}/${maxAttempts}`);
        
        const analysisResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${Deno.env.get('GOOGLE_GEMINI_API_KEY')}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      fileData: {
                        mimeType: fileInfo.mimeType,
                        fileUri: fileInfo.uri
                      }
                    },
                    {
                      text: buildTvAnalysisPrompt(categories, clients)
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.1,
                topK: 32,
                topP: 0.8,
                maxOutputTokens: 8192
                // Note: No responseMimeType - allow flexible [TIPO DE CONTENIDO:] format
              }
            })
          }
        );

        if (!analysisResponse.ok) {
          const errorText = await analysisResponse.text();
          console.error(`[gemini-unified] API Response Error:`, {
            status: analysisResponse.status,
            statusText: analysisResponse.statusText,
            body: errorText,
            attempt: attempt,
            mimeType: fileInfo.mimeType,
            videoPath: videoPath
          });
          
          // MP4-specific error handling for 400 errors
          if (analysisResponse.status === 400 && fileInfo.mimeType.includes('mp4')) {
            console.log(`[gemini-unified] MP4 format rejected by Gemini (attempt ${attempt}) for video: ${videoPath}`);
            if (attempt === maxAttempts) {
              throw new Error(`MP4 format not supported by Gemini API. Status: ${analysisResponse.status}. Consider converting to MOV format.`);
            }
          }
          
          throw new Error(`Gemini API error: ${analysisResponse.status} - ${errorText}`);
        }

        const analysisData = await analysisResponse.json();
        if (!analysisData.candidates || analysisData.candidates.length === 0) {
          throw new Error('No analysis response from Gemini');
        }

        analysisResult = analysisData.candidates[0].content.parts[0].text;
        break;
      } catch (error) {
        console.error(`[gemini-unified] Analysis attempt ${attempt} failed:`, error);
        
        // Enhanced MP4 error logging
        if ((error instanceof Error && error.message.includes('MP4 format not supported')) || (error instanceof Error && error.message.includes('400'))) {
          console.error(`[gemini-unified] MP4 processing failed completely after ${maxAttempts} attempts`, {
            videoPath: videoPath || 'unknown',
            mimeType: fileInfo?.mimeType || 'unknown',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        
        if (attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }

    console.log('[gemini-unified] Analysis completed successfully');

    // Clean up file
    await cleanupGeminiFile(videoPath);
    console.log('[gemini-unified] File cleanup completed successfully');

    return {
      success: true,
      transcription: extractTranscriptionFromAnalysis(analysisResult),
      segments: extractSegmentsFromAnalysis(analysisResult),
      full_analysis: analysisResult,
      summary: extractSummaryFromAnalysis(analysisResult),
      keywords: extractKeywordsFromAnalysis(analysisResult)
    };

  } catch (error) {
    console.error('[gemini-unified] Assembled video processing error:', error);
    throw new Error(`Assembled video processing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function buildTvAnalysisPrompt(categories: any[], clients: any[]): string {
  // Generate dynamic clients list
  const clientsList = clients.map(c => c.name).join(', ');
  
  // Generate dynamic categories list
  const categoriesList = [
    'Accidentes', 'Agencia de Gobierno', 'Ambiente', 'Ambiente & El Tiempo',
    'Ciencia & Tecnología', 'Comunidad', 'Crimen', 'Deportes',
    'Economía & Negocios', 'Educación & Cultura', 'EE.UU. & Internacionales',
    'Entretenimiento', 'Gobierno', 'Otras', 'Política', 'Religión', 'Salud', 'Tribunales'
  ].join(', ');
  
  // Generate dynamic client-keyword mapping
  const clientKeywordMapping = `
**Accidentes:** tráfico, autopista, PR-52, heridas, choque
**Agencia de Gobierno:** infraestructura, Naguabo, PROMESA, carreteras, servicios públicos
**Ambiente:** conservación, bosques, reforestación, educación ambiental
**Ambiente & El Tiempo:** tormenta tropical, lluvias, vientos, alerta
**Ciencia & Tecnología:** científicos, Universidad de Puerto Rico, detección temprana, enfermedades tropicales
**Comunidad:** Cruz Roja Americana, talleres, primeros auxilios, Hospital del Niño, recaudación de fondos
**Crimen:** Policía, arresto, robos, San Juan, investigaciones
**Deportes:** baloncesto, equipo nacional, torneo, Juegos Olímpicos, victoria
**Economía & Negocios:** economía, recuperación, Coop de Seguros Múltiples, ingresos, Ford, vehículos
**Educación & Cultura:** Departamento de Educación, currículo, historia, cultura, estudiantes
**EE.UU. & Internacionales:** tensiones diplomáticas, Estados Unidos, China, negociaciones comerciales, repercusiones económicas
**Entretenimiento:** Telemundo, serie, público puertorriqueño, actores
**Gobierno:** Etica Gubernamental, investigación, irregularidades, fondos públicos, agencias gubernamentales
**Otras:** organizaciones sin fines de lucro, campaña, concienciación, voluntariado, eventos, actividades
**Política:** elecciones, candidatos, plataformas, propuestas, debate, temas económicos, temas sociales
**Religión:** festividades, iglesias, eventos, actividades, feligreses
**Salud:** enfermedades respiratorias, campañas de prevención, atención primaria, capacidad hospitalaria, medicamentos
**Tribunales:** Tribunal Supremo, decisión, derechos civiles, precedente, organizaciones de derechos humanos`;

  return `Eres un analista experto en contenido de TV. Tu tarea es analizar la siguiente transcripción de TV en español e identificar y separar el contenido publicitario del contenido regular del programa.

IMPORTANTE - FORMATO DE RESPUESTA:
Debes identificar y separar claramente cada sección de contenido, comenzando CADA SECCIÓN con uno de estos encabezados:

[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]
o
[TIPO DE CONTENIDO: PROGRAMA REGULAR]

IDENTIFICACIÓN DE ANUNCIOS:
Señales clave para identificar anuncios:
- Menciones de precios, ofertas o descuentos
- Llamadas a la acción ("llame ahora", "visite nuestra tienda", etc.)
- Información de contacto (números de teléfono, direcciones)
- Menciones repetidas de marcas o productos específicos
- Lenguaje persuasivo o promocional

PARA CADA SECCIÓN DE ANUNCIO PUBLICITARIO:
1. Marca(s) o producto(s) anunciados
2. Mensajes clave del anuncio
3. Llamada a la acción (si existe)
4. Tono del anuncio
5. Duración aproximada

PARA CADA SECCIÓN DE PROGRAMA REGULAR:
1. Resumen del contenido (70-100 oraciones)
   - Incluir desarrollo cronológico de los temas
   - Destacar citas textuales relevantes
   - Mencionar interacciones entre participantes si las hay
   - Identificación de los participantes en la conversación (cuántos hablantes participan y si se pueden identificar sus roles o nombres) [utilizar los nombres específicos de los hablantes cuando estén disponibles]

2. Temas principales tratados
   - Listar temas por orden de importancia
   - Incluir subtemas relacionados
   - Señalar conexiones entre temas si existen

3. Tono del contenido
   - Estilo de la presentación (formal/informal)
   - Tipo de lenguaje utilizado
   - Enfoque del contenido (informativo/editorial/debate)

4. Categorías aplicables de: ${categoriesList}
   - Justificar la selección de cada categoría
   - Indicar categoría principal y secundarias

5. Presencia de personas o entidades relevantes mencionadas

6. Clientes relevantes que podrían estar interesados en este contenido. Lista de clientes disponibles: ${clientsList}

7. Palabras clave mencionadas relevantes para los clientes. Lista de correlación entre clientes y palabras clave:
${clientKeywordMapping}

Responde en español de manera concisa y profesional. Asegúrate de:
1. Comenzar SIEMPRE con el encabezado de tipo de contenido correspondiente en mayúsculas
2. Si es un anuncio, enfatizar las marcas, productos y llamadas a la acción
3. Si es contenido regular, mantener el formato de análisis detallado
4. Incluir las palabras textuales que justifiquen las asociaciones con clientes o palabras clave
5. Utilizar los nombres específicos de los hablantes cuando estén disponibles en lugar de referencias genéricas como "SPEAKER A" o "SPEAKER B"

IMPORTANTE - MANEJO DE HABLANTES:
La transcripción incluye nombres específicos de hablantes (pueden ser nombres propios como "María", "Juan", etc., en lugar de etiquetas genéricas). Utiliza estos nombres específicos en tu análisis para:
- Identificar diferentes personas y sus roles
- Describir la dinámica de la conversación
- Mencionar contribuciones específicas de cada participante
- Proporcionar un análisis más personalizado y profesional

Evita usar referencias genéricas como "hablante 1", "participante A", etc., cuando tengas nombres específicos disponibles.`;
}

// Helper functions to extract data from analysis
function extractTranscriptionFromAnalysis(analysis: string): string {
  console.log('[extractTranscriptionFromAnalysis] Starting transcription extraction');
  
  // Strategy 1: Extract from [TIPO DE CONTENIDO:] format (PRIMARY for video analysis)
  const contentSections = analysis.match(/\[TIPO DE CONTENIDO: PROGRAMA REGULAR\]([\s\S]*?)(?=\[TIPO DE CONTENIDO:|$)/gi);
  if (contentSections && contentSections.length > 0) {
    console.log('[extractTranscriptionFromAnalysis] Found [TIPO DE CONTENIDO:] format');
    
    let transcriptionText = '';
    contentSections.forEach(section => {
      // Extract the "Resumen del contenido" which contains the narrative transcription
      const summaryMatch = section.match(/1\.\s*Resumen del contenido[:\s]*([\s\S]*?)(?=\n2\.|$)/i);
      if (summaryMatch && summaryMatch[1]) {
        transcriptionText += summaryMatch[1].trim() + '\n\n';
      }
    });
    
    if (transcriptionText.length > 100) {
      console.log('[extractTranscriptionFromAnalysis] Extracted transcription from content summaries');
      return transcriptionText.trim();
    }
  }
  
  // Strategy 2: Extract from JSON structure
  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.transcription && typeof parsed.transcription === 'string') {
        const cleanTranscription = cleanTranscriptionOnly(parsed.transcription);
        if (cleanTranscription && hasSeparatedSpeakers(cleanTranscription)) {
          console.log('[extractTranscriptionFromAnalysis] Found clean transcription in JSON');
          return cleanTranscription;
        }
      }
    }
  } catch (error) {
    console.log('[extractTranscriptionFromAnalysis] JSON parsing failed, trying text extraction');
  }
  
  // Strategy 3: Extract from structured text sections with SPEAKER patterns
  const sectionPatterns = [
    /## TRANSCRIPCIÓN PASO A PASO:[\s\S]*?(\*\*EJEMPLOS CORRECTOS:\*\*[\s\S]*?)(?=##|\{|$)/s,
    /SPEAKER\s+\d+:[\s\S]*?(?=\n\n\{|\n\{|$)/s,
    /^(SPEAKER\s+\d+:.*$)/gm
  ];
  
  for (const pattern of sectionPatterns) {
    const matches = analysis.match(pattern);
    if (matches) {
      const extractedText = Array.isArray(matches) ? matches.join('\n') : matches[0];
      const cleanText = cleanTranscriptionOnly(extractedText);
      if (cleanText && hasSeparatedSpeakers(cleanText)) {
        console.log('[extractTranscriptionFromAnalysis] Found speaker patterns in text sections');
        return cleanText;
      }
    }
  }
  
  // Strategy 4: Look for individual SPEAKER lines throughout the text
  const speakerLines = analysis.match(/^SPEAKER\s+\d+:\s*[^:]+:\s*.+$/gm);
  if (speakerLines && speakerLines.length > 1) {
    console.log('[extractTranscriptionFromAnalysis] Found multiple speaker lines');
    return speakerLines.join('\n');
  }
  
  // Strategy 5: Enhanced parsing for mixed content
  const enhancedParsing = parseAndSeparateSpeakers(analysis);
  if (enhancedParsing && enhancedParsing.length > 50) {
    console.log('[extractTranscriptionFromAnalysis] Used enhanced parsing');
    return enhancedParsing;
  }
  
  console.log('[extractTranscriptionFromAnalysis] All strategies failed, returning fallback');
  return 'Transcripción no disponible - no se pudieron identificar speakers separados';
}

// Clean transcription content only - remove all analysis
function cleanTranscriptionOnly(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove JSON artifacts
  cleaned = cleaned
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/')
    .replace(/[\{\}"]/g, '')
    .trim();
  
  // Remove analysis sections and markers
  cleaned = cleaned
    .replace(/## ANÁLISIS EN JSON SEPARADO:[\s\S]*/s, '')
    .replace(/\{[\s\S]*\}/, '')
    .replace(/## INSTRUCCIONES CRÍTICAS:[\s\S]*?(?=SPEAKER\s+\d+:|$)/s, '')
    .replace(/\*\*PASO \d+ - [\s\S]*?(?=SPEAKER\s+\d+:|$)/s, '')
    .replace(/\*\*EJEMPLOS [\s\S]*?(?=SPEAKER\s+\d+:|$)/s, '')
    .replace(/❌[\s\S]*?(?=SPEAKER\s+\d+:|$)/s, '');
  
  // Extract only SPEAKER lines
  const speakerLines = cleaned.match(/^SPEAKER\s+\d+:\s*[^:]+:\s*.+$/gm);
  if (speakerLines && speakerLines.length > 0) {
    return speakerLines.join('\n');
  }
  
  // Fallback: look for any speaker-like patterns
  const lines = cleaned.split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line || line.length < 10) return false;
      // Keep only lines that look like speaker dialogue
      return /^SPEAKER\s+\d+:\s*[^:]+:\s*.+/i.test(line) ||
             /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]{1,20}:\s*[^:].+/.test(line);
    });
  
  return lines.join('\n');
}

// Check if text has properly separated speakers
function hasSeparatedSpeakers(text: string): boolean {
  if (!text) return false;
  
  const speakerMatches = text.match(/^SPEAKER\s+\d+:/gm);
  const uniqueSpeakers = new Set();
  
  if (speakerMatches) {
    speakerMatches.forEach(match => {
      const speakerNum = match.match(/SPEAKER\s+(\d+):/);
      if (speakerNum) uniqueSpeakers.add(speakerNum[1]);
    });
  }
  
  // Should have at least 2 different speakers or multiple speaker instances
  return uniqueSpeakers.size >= 2 || Boolean(speakerMatches && speakerMatches.length >= 3);
}

// Enhanced parsing to separate speakers from mixed content
function parseAndSeparateSpeakers(text: string): string {
  if (!text) return '';
  
  console.log('[parseAndSeparateSpeakers] Starting enhanced speaker separation');
  
  const lines = text.split('\n');
  const speakerLines: string[] = [];
  const seenSpeakers = new Map<string, number>();
  let speakerCounter = 1;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 15) continue;
    
    // Skip analysis content
    if (isAnalysisContent(trimmedLine)) continue;
    
    // Look for existing SPEAKER format
    const existingSpeaker = trimmedLine.match(/^SPEAKER\s+(\d+):\s*([^:]+):\s*(.+)$/);
    if (existingSpeaker) {
      speakerLines.push(trimmedLine);
      continue;
    }
    
    // Look for speaker patterns to convert
    const speakerPatterns = [
      /^([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]{2,25}):\s*(.+)$/,  // "NOMBRE APELLIDO: texto"
      /^-\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s]{2,25}):\s*(.+)$/, // "- NOMBRE: texto"
      /\[([A-ZÁÉÍÓÚÑÜ\s]+)\]:\s*(.+)$/ // "[NOMBRE]: texto"
    ];
    
    for (const pattern of speakerPatterns) {
      const match = trimmedLine.match(pattern);
      if (match && match[2] && match[2].length > 10) {
        const speakerName = match[1].trim();
        const dialogue = match[2].trim();
        
        // Assign consistent speaker numbers
        if (!seenSpeakers.has(speakerName)) {
          seenSpeakers.set(speakerName, speakerCounter++);
        }
        
        const speakerNum = seenSpeakers.get(speakerName);
        speakerLines.push(`SPEAKER ${speakerNum}: ${speakerName}: ${dialogue}`);
        break;
      }
    }
  }
  
  console.log(`[parseAndSeparateSpeakers] Found ${speakerLines.length} speaker lines with ${seenSpeakers.size} unique speakers`);
  return speakerLines.join('\n');
}

// Check if line contains analysis content
function isAnalysisContent(text: string): boolean {
  const analysisKeywords = [
    'analysis', 'análisis', 'resumen', 'summary', 'keywords', 'palabras',
    'visual_analysis', 'segments', 'transcription', 'transcripción',
    'who', 'what', 'when', 'where', 'why', 'quién', 'qué', 'cuándo', 'dónde', 'por qué',
    'JSON', 'PASO', 'INSTRUCCIONES', 'CRÍTICAS', 'EJEMPLOS', 'FORMATO'
  ];
  
  const lowerText = text.toLowerCase();
  return analysisKeywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase()) ||
    text.startsWith('##') ||
    text.startsWith('**') ||
    text.startsWith('{') ||
    text.includes('"')
  );
}

// Check for TV speaker patterns
function hasTvSpeakerPatterns(text: string): boolean {
  if (!text || !text.trim()) return false;
  
  const patterns = [
    /SPEAKER\s+\d+:/i,
    /PRESENTER:/i,
    /HOST:/i,
    /GUEST:/i,
    /LOCUTOR:/i,
    /ENTREVISTADO:/i,
    /\[SPEAKER\s+\d+\]/i,
    /^\s*-\s*\w+:/m,
    /^[A-ZÁÉÍÓÚÑÜ\s]+:\s*/m  // Generic "NAME: " pattern
  ];
  
  return patterns.some(pattern => pattern.test(text));
}

function extractSegmentsFromAnalysis(analysis: string): any[] {
  // For text-based analysis, we'll create simple segments based on content sections
  const segments: any[] = [];
  const contentSections = analysis.split(/\[TIPO DE CONTENIDO:/);
  
  contentSections.forEach((section, index) => {
    if (index === 0) return; // Skip the first part (before any content type)
    
    const contentType = section.split(']')[0];
    const content = section.split(']').slice(1).join(']').trim();
    
    if (content) {
      segments.push({
        headline: contentType === 'ANUNCIO PUBLICITARIO' ? 'Anuncio Publicitario' : 'Programa Regular',
        text: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        start: index * 30000, // Rough timing
        end: (index + 1) * 30000,
        keywords: extractKeywordsFromContent(content)
      });
    }
  });
  
  return segments;
}

function extractSummaryFromAnalysis(analysis: string): string {
  // Extract a summary from the regular content section
  const programMatch = analysis.match(/\[TIPO DE CONTENIDO: PROGRAMA REGULAR\]([\s\S]*?)(?=\[TIPO DE CONTENIDO:|$)/);
  if (programMatch) {
    const content = programMatch[1].trim();
    const summaryMatch = content.match(/1\.\s*Resumen del contenido[:\s]*([\s\S]*?)(?=\n2\.|$)/);
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }
  }
  return 'Análisis completado exitosamente';
}

function extractKeywordsFromAnalysis(analysis: string): string[] {
  return extractKeywordsFromContent(analysis);
}

function extractKeywordsFromContent(content: string): string[] {
  // Extract keywords from content
  const keywordMatch = content.match(/(?:palabras clave|keywords)[:\s]*([^\n]*)/i);
  if (keywordMatch) {
    return keywordMatch[1].split(',').map(k => k.trim()).filter(k => k);
  }
  
  // Fallback: extract common Spanish words
  const words = content.toLowerCase().match(/\b[a-záéíóúñü]{4,}\b/g) || [];
  const uniqueWords = [...new Set(words)];
  return uniqueWords.slice(0, 10);
}

// Parse analysis for TV database structure - Enhanced to handle [TIPO DE CONTENIDO:] format
function parseAnalysisForTvDatabase(analysis: string): {
  transcription: string;
  summary: string;
  quien: string;
  que: string;
  cuando: string;
  donde: string;
  porque: string;
  keywords: string[];
  category: string;
  content_summary: string;
} {
  // Strategy 1: Parse [TIPO DE CONTENIDO:] format (PRIMARY for video analysis)
  const hasContentTypeFormat = analysis.includes('[TIPO DE CONTENIDO:');
  
  if (hasContentTypeFormat) {
    console.log('[parseAnalysisForTvDatabase] Parsing [TIPO DE CONTENIDO:] format');
    
    // Extract all content summaries for the full readable analysis
    const contentSections = analysis.match(/\[TIPO DE CONTENIDO: [^\]]+\]([\s\S]*?)(?=\[TIPO DE CONTENIDO:|$)/gi);
    let contentSummary = '';
    
    if (contentSections) {
      contentSections.forEach((section, index) => {
        const typeMatch = section.match(/\[TIPO DE CONTENIDO: ([^\]]+)\]/);
        const contentType = typeMatch ? typeMatch[1] : 'Contenido';
        
        contentSummary += `\n[TIPO DE CONTENIDO: ${contentType}]\n`;
        
        // Extract summary
        const summaryMatch = section.match(/1\.\s*Resumen del contenido[:\s]*([\s\S]*?)(?=\n2\.|$)/i);
        if (summaryMatch) {
          contentSummary += `\nResumen: ${summaryMatch[1].trim()}\n`;
        }
        
        // Extract key topics
        const topicsMatch = section.match(/2\.\s*Temas principales[:\s]*([\s\S]*?)(?=\n3\.|$)/i);
        if (topicsMatch) {
          contentSummary += `Temas: ${topicsMatch[1].trim()}\n`;
        }
        
        // Extract categories
        const categoriesMatch = section.match(/3\.\s*Categorías[:\s]*([\s\S]*?)(?=\n4\.|$)/i);
        if (categoriesMatch) {
          contentSummary += `Categorías: ${categoriesMatch[1].trim()}\n`;
        }
        
        // Extract keywords
        const keywordsMatch = section.match(/4\.\s*Palabras clave[:\s]*([\s\S]*?)(?=\n5\.|$)/i);
        if (keywordsMatch) {
          contentSummary += `Palabras clave: ${keywordsMatch[1].trim()}\n`;
        }
        
        if (index < contentSections.length - 1) {
          contentSummary += '\n---\n';
        }
      });
    }
    
    return {
      transcription: extractTranscriptionFromAnalysis(analysis),
      summary: extractSummaryFromAnalysis(analysis),
      quien: extractFieldFromAnalysis(analysis, 'participantes|quien|who'),
      que: extractFieldFromAnalysis(analysis, 'temas principales|que|what'),
      cuando: extractFieldFromAnalysis(analysis, 'cuando|when'),
      donde: extractFieldFromAnalysis(analysis, 'donde|where'),
      porque: extractFieldFromAnalysis(analysis, 'porque|why'),
      keywords: extractKeywordsFromAnalysis(analysis),
      category: extractFieldFromAnalysis(analysis, 'categorías|category'),
      content_summary: contentSummary.trim() || 'Análisis visual completado'
    };
  }
  
  // Strategy 2: Try to parse as JSON
  try {
    const cleanJson = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedAnalysis = JSON.parse(cleanJson);
    
    // Handle both Spanish and English JSON formats
    return {
      transcription: parsedAnalysis.transcription || extractTranscriptionFromAnalysis(analysis),
      summary: parsedAnalysis.resumen || parsedAnalysis.summary || extractSummaryFromAnalysis(analysis),
      quien: parsedAnalysis.analisis_5w?.quien || parsedAnalysis.analysis?.who || extractFieldFromAnalysis(analysis, 'quien|who'),
      que: parsedAnalysis.analisis_5w?.que || parsedAnalysis.analysis?.what || extractFieldFromAnalysis(analysis, 'que|what'),
      cuando: parsedAnalysis.analisis_5w?.cuando || parsedAnalysis.analysis?.when || extractFieldFromAnalysis(analysis, 'cuando|when'),
      donde: parsedAnalysis.analisis_5w?.donde || parsedAnalysis.analysis?.where || extractFieldFromAnalysis(analysis, 'donde|where'),
      porque: parsedAnalysis.analisis_5w?.porque || parsedAnalysis.analysis?.why || extractFieldFromAnalysis(analysis, 'porque|why'),
      keywords: parsedAnalysis.palabras_clave || parsedAnalysis.keywords || extractKeywordsFromAnalysis(analysis),
      category: parsedAnalysis.categoria || parsedAnalysis.category || 'televisión',
      content_summary: parsedAnalysis.visual_analysis || 'Análisis visual completado'
    };
  } catch (parseError) {
    console.error('[parseAnalysisForTvDatabase] JSON parse error, using text extraction:', parseError);
    
    // Fallback to text extraction
    return {
      transcription: extractTranscriptionFromAnalysis(analysis),
      summary: extractSummaryFromAnalysis(analysis),
      quien: extractFieldFromAnalysis(analysis, 'quien|who'),
      que: extractFieldFromAnalysis(analysis, 'que|what'),
      cuando: extractFieldFromAnalysis(analysis, 'cuando|when'),
      donde: extractFieldFromAnalysis(analysis, 'donde|where'),
      porque: extractFieldFromAnalysis(analysis, 'porque|why'),
      keywords: extractKeywordsFromAnalysis(analysis),
      category: 'televisión',
      content_summary: 'Análisis completado exitosamente'
    };
  }
}

// Extract specific fields from text-based analysis
function extractFieldFromAnalysis(analysis: string, fieldPattern: string): string {
  const regex = new RegExp(`(?:${fieldPattern})[:\\s]*([^\\n]*?)(?=\\n|$)`, 'i');
  const match = analysis.match(regex);
  if (match) {
    return match[1].trim();
  }
  
  // Try alternative patterns
  const altRegex = new RegExp(`\\*\\*(?:${fieldPattern})\\*\\*[:\\s]*([^\\n]*?)(?=\\n|$)`, 'i');
  const altMatch = analysis.match(altRegex);
  if (altMatch) {
    return altMatch[1].trim();
  }
  
  return 'No especificado';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  console.log(`[${requestId}] === UNIFIED PROCESSING START ===`);

  // Parse request body once and store it for potential error handling
  let requestBody;
  let videoPath, transcriptionId;
  
  try {
    requestBody = await req.text();
    const parsedBody = JSON.parse(requestBody);
    videoPath = parsedBody.videoPath;
    transcriptionId = parsedBody.transcriptionId;
  } catch (parseError) {
    console.error(`[${requestId}] Failed to parse request body:`, parseError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid request body',
        details: parseError instanceof Error ? parseError.message : String(parseError) 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

    console.log('[process-tv-with-gemini] Environment validation:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      hasGeminiApiKey: !!geminiApiKey,
      supabaseUrlLength: supabaseUrl?.length,
      geminiKeyLength: geminiApiKey?.length
    });

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Missing required environment variables');
    }

    console.log(`[${requestId}] Environment validated successfully`);
    
    console.log(`[${requestId}] Request details:`, {
      videoPath,
      transcriptionId,
      hasVideoPath: !!videoPath,
      hasTranscriptionId: !!transcriptionId,
      videoPathLength: videoPath?.length
    });

    if (!videoPath) {
      throw new Error('videoPath is required');
    }
    
    if (!transcriptionId) {
      throw new Error('transcriptionId is required');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Detect MP4 files for enhanced processing
    const isMP4File = videoPath.toLowerCase().includes('.mp4');
    if (isMP4File) {
      console.log(`[${requestId}] MP4 file detected - will use enhanced error handling`);
    }

    // Update progress to show we're starting
    await updateDatabaseProgress(transcriptionId, 20, 'Starting AI processing...');

    // Step 1: Conditionally compress video for AI analysis
    const isChunkedPath = videoPath.startsWith('chunked:');
    let shouldCompress = false;
    
    if (!isChunkedPath) {
      // Check file size for assembled files to determine if compression is needed
      try {
        const { data: fileData } = await supabase.storage.from('video').download(videoPath);
        if (fileData) {
          const fileSize = fileData.size;
          // Only compress files larger than 250MB
          shouldCompress = fileSize > 250 * 1024 * 1024;
          console.log(`[${requestId}] File size: ${Math.round(fileSize / 1024 / 1024)}MB, shouldCompress: ${shouldCompress}`);
        }
      } catch (error) {
        console.log(`[${requestId}] Could not check file size, skipping compression:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    let compressedVideoPath = videoPath;
    let wasCompressed = false;
    
    if (shouldCompress) {
      console.log(`[${requestId}] Step 1: Compressing large video for AI analysis...`);
      if (transcriptionId) {
        await updateDatabaseProgress(transcriptionId, 10, 'Compressing video for AI analysis...');
      }
      
      try {
        const compressResponse = await supabase.functions.invoke('compress-tv-video', {
          body: { videoPath }
        });

        if (compressResponse.data && compressResponse.data.success) {
          compressedVideoPath = compressResponse.data.compressedPath;
          wasCompressed = true;
          console.log(`[${requestId}] Video compressed successfully: ${compressedVideoPath}`);
        } else {
          console.log(`[${requestId}] Compression failed, using original: ${compressResponse.error?.message || 'Unknown error'}`);
        }
      } catch (compressionError: any) {
        console.log(`[${requestId}] Compression failed, using original: ${compressionError.message}`);
      }
    } else {
      console.log(`[${requestId}] Skipping compression (chunked path or small file)`);
    }

    if (transcriptionId) {
      await updateDatabaseProgress(transcriptionId, 20, wasCompressed ? 'Video compressed successfully, starting AI processing...' : 'Starting AI processing...');
    }
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    console.log(`[${requestId}] Authenticated user:`, user.id);

    // Fetch categories and clients for dynamic prompt
    console.log(`[${requestId}] Fetching categories and clients for dynamic prompt...`);
    
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name_es, name_en');
    
    if (categoriesError) {
      console.error(`[${requestId}] Categories error:`, categoriesError);
    }
    
    console.log(`[${requestId}] Fetched ${categories?.length || 0} categories`);

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (clientsError) {
      console.error(`[${requestId}] Clients error:`, clientsError);
    }
    
    console.log(`[${requestId}] Fetched ${clients?.length || 0} clients`);

    // Process video file (using compressed version where available)
    let result;
    
    if (compressedVideoPath.startsWith('chunked:')) {
      // Handle chunked upload paths in both formats:
      // 1) chunked:<sessionId>
      // 2) chunked:<displayName>_<sessionId>
      console.log(`[${requestId}] Processing chunked upload...`);
      const chunkInfo = compressedVideoPath.replace('chunked:', '');

      // Try to resolve a valid sessionId first
      let sessionId = chunkInfo; // assume full session id by default
      let displayName = '';

      // Attempt exact match in manifest (newer format 'chunked:<sessionId>')
      let manifestExact: any = null;
      try {
        const { data, error } = await supabase
          .from('video_chunk_manifests')
          .select('session_id, file_name')
          .eq('session_id', sessionId)
          .single();
        if (!error) manifestExact = data;
      } catch (e) {
        // ignore 406/No rows errors
      }

      if (!manifestExact) {
        // Fallback: treat chunkInfo as "<displayName>_<suffix>" and try to locate by suffix
        const suffix = chunkInfo.split('_').pop() || chunkInfo;
        console.log(`[${requestId}] No exact manifest for '${chunkInfo}'. Trying suffix lookup: '${suffix}'`);
        try {
          const { data: sessionRow, error: sessionErr } = await supabase
            .from('chunked_upload_sessions')
            .select('session_id, file_name')
            .like('session_id', `%_${suffix}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!sessionErr && sessionRow?.session_id) {
            sessionId = sessionRow.session_id;
            displayName = sessionRow.file_name?.replaceAll('/', '_').replaceAll('-', '_') || '';
            console.log(`[${requestId}] Resolved session via suffix: ${sessionId} displayName: ${displayName}`);
          } else {
            // Last resort: preserve original assumption and derive displayName later
            console.warn(`[${requestId}] Could not resolve session via suffix for '${chunkInfo}'. Proceeding with '${sessionId}'.`);
          }
        } catch (e) {
          console.error(`[${requestId}] Error during suffix session lookup:`, e);
        }
      } else {
        // We have exact manifest match
        displayName = manifestExact.file_name?.replaceAll('/', '_').replaceAll('-', '_') || '';
        console.log(`[${requestId}] Exact manifest matched for session: ${sessionId} displayName: ${displayName}`);
      }

      // If displayName still empty, try deriving from DB
      if (!displayName || displayName.trim().length === 0) {
        console.log(`[${requestId}] Deriving displayName for session: ${sessionId}`);
        try {
          // Prefer manifest record
          const { data: manifest, error: manifestErr } = await supabase
            .from('video_chunk_manifests')
            .select('file_name')
            .eq('session_id', sessionId)
            .single();

          let sourceFileName = manifest?.file_name as string | undefined;

          if (manifestErr || !sourceFileName) {
            // Fallback to chunked session
            const { data: sessionRow, error: sessionErr } = await supabase
              .from('chunked_upload_sessions')
              .select('file_name')
              .eq('session_id', sessionId)
              .single();

            if (!sessionErr && sessionRow?.file_name) {
              sourceFileName = sessionRow.file_name as string;
            }
          }

          if (sourceFileName) {
            displayName = sourceFileName.replaceAll('/', '_').replaceAll('-', '_');
            console.log(`[${requestId}] Derived displayName: ${displayName}`);
          } else {
            console.warn(`[${requestId}] Could not derive displayName for session ${sessionId}. Will attempt with empty displayName.`);
          }
        } catch (e) {
          console.error(`[${requestId}] Error deriving displayName:`, e);
        }
      }
      
      result = await processChunkedUploadWithGemini(sessionId, displayName, transcriptionId, categories || [], clients || []);
    } else {
      // Handle assembled video file (use compressed version if available)
      console.log(`[${requestId}] Processing assembled video file from video bucket...`);
      result = await processAssembledVideoWithGemini(compressedVideoPath, transcriptionId, categories || [], clients || []);
    }

    console.log(`[${requestId}] Processing completed, updating database...`);
    
    // Update database with results
    if (transcriptionId && result.success) {
      await updateDatabaseProgress(transcriptionId, 100, 'completed');
      
      // Parse analysis to extract structured data for TV table
      const parsedAnalysis = parseAnalysisForTvDatabase(result.full_analysis || '');
      
      // Store complete analysis with correct TV table structure
      await supabase
        .from('tv_transcriptions')
        .update({
          transcription_text: result.transcription || parsedAnalysis.transcription,
          analysis_summary: parsedAnalysis.summary,
          analysis_quien: parsedAnalysis.quien,
          analysis_que: parsedAnalysis.que,
          analysis_cuando: parsedAnalysis.cuando,
          analysis_donde: parsedAnalysis.donde,
          analysis_porque: parsedAnalysis.porque,
          analysis_keywords: parsedAnalysis.keywords,
          analysis_category: parsedAnalysis.category,
          analysis_content_summary: parsedAnalysis.content_summary,
          full_analysis: result.full_analysis,
          was_compressed: wasCompressed,
          compressed_path: wasCompressed ? compressedVideoPath : null,
          status: 'completed',
          progress: 100
        })
        .eq('id', transcriptionId);
    }

    // Clean up compressed video if it was created
    if (compressedVideoPath !== videoPath) {
      try {
        console.log(`[${requestId}] Cleaning up compressed video: ${compressedVideoPath}`);
        await supabase.storage.from('media').remove([compressedVideoPath]);
        console.log(`[${requestId}] Compressed video cleanup completed`);
      } catch (cleanupError: any) {
        console.error(`[${requestId}] Compressed video cleanup failed:`, cleanupError.message);
        // Don't throw error for cleanup failure
      }
    }

    console.log(`[${requestId}] === UNIFIED PROCESSING COMPLETED ===`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[${requestId}] === UNIFIED PROCESSING FAILED ===`);
    console.error(`[${requestId}] Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
      isMemoryError: (error instanceof Error && error.message?.includes('memory')) || (error instanceof Error && error.message?.includes('heap'))
    });

    // Update transcription status to failed if we have an ID
    try {
      if (transcriptionId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await updateDatabaseProgress(transcriptionId, 100, 'failed');
        console.log(`[${requestId}] Updated transcription status to failed`);
      }
    } catch (updateError) {
      console.error(`[${requestId}] Could not update transcription status:`, updateError);
    }

    // Categorize and return appropriate error
    const errorMessage = categorizeError(error instanceof Error ? error.message : String(error));
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
