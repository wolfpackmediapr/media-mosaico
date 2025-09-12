import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    throw new Error(`Video upload failed: ${error.message}`);
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
    throw new Error(`Streaming upload failed: ${error.message}`);
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
    throw new Error(`Database update failed: ${error.message}`);
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

  // Build TV-specific prompt
  const prompt = `Analiza el siguiente contenido de TV y proporciona un análisis detallado en formato JSON:

CATEGORÍAS DISPONIBLES: ${categories.map(c => c.name).join(', ')}
CLIENTES DISPONIBLES: ${clients.map(c => c.name).join(', ')}

CONTENIDO A ANALIZAR:
${transcriptText}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "summary": "Resumen ejecutivo del contenido",
  "category": "Una de las categorías disponibles que mejor aplique",
  "clients": ["Lista de clientes mencionados o relevantes"],
  "keywords": ["palabras", "clave", "relevantes"],
  "sentiment": "positivo/negativo/neutral",
  "topics": ["temas", "principales", "discutidos"],
  "mentions": {
    "people": ["personas mencionadas"],
    "organizations": ["organizaciones mencionadas"],
    "locations": ["lugares mencionados"]
  }
}`;

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
    throw new Error(`Failed to generate analysis: ${error.message}`);
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
      
      throw new Error(`Failed to download video after reassembly attempt: ${error.message}`);
    }

    if (error) {
      throw new Error(`Failed to download video: ${error.message}`);
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
    throw new Error(`Video download failed: ${error.message}`);
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
    throw new Error(`Chunked upload processing failed: ${error.message}`);
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
       throw new Error(`Failed to download video: ${downloadError.message}`);
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
        if (error.message.includes('MP4 format not supported') || error.message.includes('400')) {
          console.error(`[gemini-unified] MP4 processing failed completely after ${maxAttempts} attempts`, {
            videoPath: videoPath || 'unknown',
            mimeType: fileInfo?.mimeType || 'unknown',
            error: error.message
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
    throw new Error(`Assembled video processing failed: ${error.message}`);
  }
}

function buildTvAnalysisPrompt(categories: any[], clients: any[]): string {
  // Generate dynamic clients list
  const clientsList = clients.map(c => c.name).join('\n   - ');
  
  // Generate dynamic categories list
  const categoriesList = [
    'Accidentes', 'Agencia de Gobierno', 'Ambiente', 'Ambiente & El Tiempo',
    'Ciencia & Tecnología', 'Comunidad', 'Crimen', 'Deportes',
    'Economía & Negocios', 'Educación & Cultura', 'EE.UU. & Internacionales',
    'Entretenimiento', 'Gobierno', 'Otras', 'Política', 'Religión', 'Salud', 'Tribunales'
  ].join('\n   - ');
  
  // Generate dynamic client-keyword mapping
  const clientKeywordMapping = clients.map(client => {
    const keywords = Array.isArray(client.keywords) ? client.keywords.join(', ') : '';
    return `**${client.name}:** ${keywords}`;
  }).join('\n');

  return `Eres un analista experto en contenido de TV. Analiza este video de televisión en español y responde EXCLUSIVAMENTE en el siguiente formato JSON válido (sin texto adicional antes o después):

{
  "transcription": "[SECCIÓN 1] Transcripción completa con formato SPEAKER X: NOMBRE: texto hablado",
  "visual_analysis": "[SECCIÓN 2] Análisis visual y de contenido", 
  "segments": [
    {
      "headline": "Título del segmento",
      "text": "Resumen del contenido",
      "start": 0,
      "end": 30000,
      "keywords": ["palabra1", "palabra2"]
    }
  ],
  "keywords": ["palabra1", "palabra2", "palabra3"],
  "summary": "Resumen ejecutivo completo",
  "analysis": {
    "who": "Quiénes participan",
    "what": "Qué se discute",
    "when": "Cuándo ocurre",
    "where": "Dónde se desarrolla", 
    "why": "Por qué es relevante"
  }
}

## INSTRUCCIONES CRÍTICAS PARA LA TRANSCRIPCIÓN:
1. **FORMATO OBLIGATORIO**: SPEAKER 1: NOMBRE REAL: [texto hablado]
2. **NOMBRES REALES**: Usa los nombres reales de los hablantes, NO "HABLANTE 1" o "PARTICIPANTE A"
3. **SEPARACIÓN CLARA**: Cada cambio de hablante debe estar en línea separada
4. **CONSISTENCIA**: Mantén el mismo nombre para cada hablante durante todo el video
5. **EJEMPLO**:
   SPEAKER 1: MARÍA RODRÍGUEZ: Buen día y bienvenidos al programa
   SPEAKER 2: CARLOS LÓPEZ: Gracias por invitarme, María

## SECCIÓN 2: ANÁLISIS DE CONTENIDO
Identifica y separa claramente cada sección:

[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]  
[TIPO DE CONTENIDO: PROGRAMA REGULAR]  

### INSTRUCCIONES PARA ANUNCIOS PUBLICITARIOS:
Para cada anuncio detectado, incluye:
1. Marca(s) o producto(s) anunciados
2. Mensajes clave del anuncio
3. Llamada a la acción (si existe)
4. Tono del anuncio (ej. promocional, urgente, emotivo)
5. Duración aproximada del anuncio
6. Palabras clave mencionadas relevantes
7. Clientes relevantes a los que podría interesarles este anuncio (según listado dinámico)
8. Justificación del mapeo con palabras clave y clientes

**Señales clave para detectar un anuncio:**
- Menciones de marcas, precios, promociones u ofertas
- Frases como "llame ahora", "visite nuestra tienda", etc.
- Teléfonos, direcciones, sitios web
- Repetición de nombres comerciales
- Tono claramente persuasivo o comercial

### INSTRUCCIONES PARA PROGRAMA REGULAR:
Todo el contenido NO publicitario debe ir en UNA SOLA sección unificada.

Incluye el siguiente análisis:

1. **Resumen del contenido (70-100 oraciones)**
   - Describe cronológicamente lo discutido
   - Cita frases relevantes textualmente
   - Describe interacciones entre los participantes
   - Usa los nombres reales disponibles de los hablantes
   - Identifica el número de participantes y sus roles

2. **Temas principales tratados**
   - Lista por orden de importancia
   - Incluye subtemas
   - Describe conexiones entre temas si las hay

3. **Tono del contenido**
   - Formal o informal
   - Tipo de lenguaje utilizado
   - Estilo general (informativo, editorial, de debate, narrativo, etc.)

4. **Categorías aplicables** (elige de esta lista):
   - ${categoriesList}

   - Indica la categoría principal y secundarias (si aplican)
   - Justifica por qué seleccionaste cada categoría

5. **Personas o entidades relevantes mencionadas**

6. **Clientes relevantes que podrían estar interesados**
   Lista dinámica de clientes disponibles:  
   - ${clientsList}

7. **Palabras clave relevantes mencionadas**
   Lista dinámica de correlación entre clientes y palabras clave:  
   ${clientKeywordMapping}

8. **Justificación de mapeo**
   - Usa frases textuales de la transcripción que justifiquen cada asociación
   - Haz el vínculo claro entre lo dicho y el cliente o tema de interés

---

### IMPORTANTE:
- **RESPONDE SOLO EN JSON** - Sin texto antes o después del JSON
- Si hay múltiples anuncios, crea una sección separada por cada uno.
- Consolidar TODO el contenido de programa en UNA sola sección.
- Siempre usar nombres reales de hablantes si aparecen.
- Si el JSON falla, asegúrate de que la transcripción mantenga el formato SPEAKER X: NOMBRE: texto`;
}

// Helper functions to extract data from analysis
function extractTranscriptionFromAnalysis(analysis: string): string {
  // Extract transcription from text-based analysis
  const transcriptionMatch = analysis.match(/## SECCIÓN 1: TRANSCRIPCIÓN CON IDENTIFICACIÓN DE HABLANTES\s*([\s\S]*?)(?=\n## SECCIÓN 2:|$)/);
  if (transcriptionMatch) {
    const extractedText = transcriptionMatch[1].trim().replace(/^- Format:.*\n- Uses.*\n- Complete.*\n\n?/m, '');
    
    // If we have speaker patterns, return as-is
    if (hasTvSpeakerPatterns(extractedText)) {
      console.log('[extractTranscriptionFromAnalysis] Found speaker patterns in extracted text');
      return extractedText;
    }
    
    // Try to parse and reformat using TV speaker parser
    console.log('[extractTranscriptionFromAnalysis] No speaker patterns found, attempting to parse and reformat');
    return parseTvSpeakerFormattedText(extractedText);
  }
  
  // Fallback: look for speaker patterns in the full analysis
  const speakerPatterns = analysis.match(/(?:SPEAKER\s+\d+:|PRESENTER:|HOST:|LOCUTOR:|ENTREVISTADO:)[\s\S]*?(?=\n\n|\n(?:SPEAKER|PRESENTER|HOST|LOCUTOR|ENTREVISTADO)|$)/gi);
  
  if (speakerPatterns && speakerPatterns.length > 0) {
    console.log('[extractTranscriptionFromAnalysis] Found speaker patterns in full analysis');
    return speakerPatterns.join('\n\n');
  }
  
  console.log('[extractTranscriptionFromAnalysis] No speaker patterns found, returning raw analysis');
  return analysis; // Fallback to full analysis if no match
}

// Parse and format TV speaker text properly
function parseTvSpeakerFormattedText(text: string): string {
  if (!text) return text;
  
  // Try to identify speaker changes and format them properly
  const lines = text.split('\n').filter(line => line.trim());
  const formattedLines: string[] = [];
  let currentSpeaker = '';
  let speakersFound = new Set<string>();
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Check if line contains speaker indicators
    const speakerIndicators = [
      /^([A-ZÁÉÍÓÚÑÜ\s]+):\s*(.+)/,  // "NOMBRE: texto"
      /^-\s*([A-ZÁÉÍÓÚÑÜ\s]+):\s*(.+)/, // "- NOMBRE: texto"
      /\[([A-ZÁÉÍÓÚÑÜ\s]+)\]:\s*(.+)/ // "[NOMBRE]: texto"
    ];
    
    let matched = false;
    for (const pattern of speakerIndicators) {
      const match = trimmedLine.match(pattern);
      if (match) {
        const speaker = match[1].trim();
        const text = match[2].trim();
        
        // Assign consistent speaker IDs
        if (!speakersFound.has(speaker)) {
          speakersFound.add(speaker);
        }
        
        formattedLines.push(`SPEAKER ${Array.from(speakersFound).indexOf(speaker) + 1}: ${speaker}: ${text}`);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // If no speaker pattern, try to associate with previous speaker or create new one
      if (currentSpeaker) {
        formattedLines.push(`${currentSpeaker} (continuación): ${trimmedLine}`);
      } else {
        // First speaker by default
        formattedLines.push(`SPEAKER 1: ${trimmedLine}`);
        currentSpeaker = 'SPEAKER 1';
      }
    }
  }
  
  return formattedLines.join('\n\n');
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
  const segments = [];
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

// Parse analysis for TV database structure
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
  try {
    // Try to parse as JSON first
    const cleanJson = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedAnalysis = JSON.parse(cleanJson);
    
    return {
      transcription: parsedAnalysis.transcription || extractTranscriptionFromAnalysis(analysis),
      summary: parsedAnalysis.summary || extractSummaryFromAnalysis(analysis),
      quien: parsedAnalysis.analysis?.who || extractFieldFromAnalysis(analysis, 'quien|who'),
      que: parsedAnalysis.analysis?.what || extractFieldFromAnalysis(analysis, 'que|what'),
      cuando: parsedAnalysis.analysis?.when || extractFieldFromAnalysis(analysis, 'cuando|when'),
      donde: parsedAnalysis.analysis?.where || extractFieldFromAnalysis(analysis, 'donde|where'),
      porque: parsedAnalysis.analysis?.why || extractFieldFromAnalysis(analysis, 'porque|why'),
      keywords: parsedAnalysis.keywords || extractKeywordsFromAnalysis(analysis),
      category: parsedAnalysis.category || 'televisión',
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
        details: parseError.message 
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
        console.log(`[${requestId}] Could not check file size, skipping compression:`, error.message);
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
      .select('id, name, name_es')
      .eq('type', 'news');
    
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
      const parsedAnalysis = parseAnalysisForTvDatabase(result.full_analysis);
      
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
      message: error.message,
      stack: error.stack,
      name: error.name,
      isMemoryError: error.message?.includes('memory') || error.message?.includes('heap')
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
    const errorMessage = categorizeError(error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
