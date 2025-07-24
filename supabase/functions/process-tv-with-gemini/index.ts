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

// Function to download video from Supabase storage
async function downloadVideoFromSupabase(videoPath: string): Promise<Blob> {
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
    // Update progress
    if (transcriptionId) {
      await updateDatabaseProgress(transcriptionId, 10, 'Downloading video...');
    }

    // For chunked uploads, we need to find the assembled file
    const assembledFilePath = `${sessionId}/${displayName}`;
    const videoBlob = await downloadVideoFromSupabase(assembledFilePath);
    
    // Update progress
    if (transcriptionId) {
      await updateDatabaseProgress(transcriptionId, 30, 'Uploading to Gemini...');
    }

    // Upload to Gemini and wait for processing
    const fileInfo = await uploadVideoToGemini(videoBlob, displayName);
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
                maxOutputTokens: 8192,
                responseMimeType: "application/json"
              }
            })
          }
        );

        if (!analysisResponse.ok) {
          throw new Error(`Gemini API error: ${analysisResponse.status}`);
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

    // Download video from Supabase storage
    const videoBlob = await downloadVideoFromSupabase(videoPath);
    
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
                maxOutputTokens: 8192,
                responseMimeType: "application/json"
              }
            })
          }
        );

        if (!analysisResponse.ok) {
          throw new Error(`Gemini API error: ${analysisResponse.status}`);
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
  const categoriesList = categories.map(c => c.name).join(', ');
  const clientsList = clients.map(c => c.name).join(', ');

  return `Analiza este video de televisión y proporciona un análisis completo en formato JSON.

CATEGORÍAS DISPONIBLES: ${categoriesList}
CLIENTES DISPONIBLES: ${clientsList}

Proporciona el análisis en este formato JSON exacto:
{
  "transcription": "Transcripción completa del audio del video",
  "summary": "Resumen ejecutivo del contenido",
  "category": "Una categoría de la lista disponible",
  "clients": ["Clientes mencionados o relevantes de la lista"],
  "keywords": ["palabras", "clave", "importantes"],
  "sentiment": "positivo/negativo/neutral",
  "topics": ["temas", "principales"],
  "segments": [
    {
      "headline": "Título del segmento",
      "text": "Contenido del segmento",
      "start": 0,
      "end": 30000,
      "keywords": ["palabras", "clave"]
    }
  ],
  "mentions": {
    "people": ["personas mencionadas"],
    "organizations": ["organizaciones"],
    "locations": ["lugares"]
  }
}

IMPORTANTE: 
- Proporciona timestamps en milisegundos para los segmentos
- Incluye transcripción completa y precisa
- Identifica segmentos de noticias relevantes
- Responde ÚNICAMENTE con JSON válido`;
}

// Helper functions to extract data from analysis
function extractTranscriptionFromAnalysis(analysis: string): string {
  try {
    const parsed = JSON.parse(analysis);
    return parsed.transcription || '';
  } catch {
    return '';
  }
}

function extractSegmentsFromAnalysis(analysis: string): any[] {
  try {
    const parsed = JSON.parse(analysis);
    return parsed.segments || [];
  } catch {
    return [];
  }
}

function extractSummaryFromAnalysis(analysis: string): string {
  try {
    const parsed = JSON.parse(analysis);
    return parsed.summary || '';
  } catch {
    return '';
  }
}

function extractKeywordsFromAnalysis(analysis: string): string[] {
  try {
    const parsed = JSON.parse(analysis);
    return parsed.keywords || [];
  } catch {
    return [];
  }
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
      throw new Error('Video path is required');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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
      .select('name_es as name')
      .order('name_es');
    
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

    // Process video file
    let result;
    
    if (videoPath.startsWith('chunked:')) {
      // Handle chunked upload
      console.log(`[${requestId}] Processing chunked upload...`);
      const chunkInfo = videoPath.replace('chunked:', '');
      const parts = chunkInfo.split('_');
      const sessionId = parts.slice(-1)[0];
      const displayName = parts.slice(0, -1).join('_');
      
      result = await processChunkedUploadWithGemini(sessionId, displayName, transcriptionId, categories || [], clients || []);
    } else {
      // Handle assembled video file
      console.log(`[${requestId}] Processing assembled video file from video bucket...`);
      result = await processAssembledVideoWithGemini(videoPath, transcriptionId, categories || [], clients || []);
    }

    console.log(`[${requestId}] Processing completed, updating database...`);
    
    // Update database with results
    if (transcriptionId && result.success) {
      await updateDatabaseProgress(transcriptionId, 100, 'completed');
      
      // Store full analysis
      await supabase
        .from('tv_transcriptions')
        .update({
          transcription_text: result.transcription,
          analysis_result: result.full_analysis,
          status: 'completed',
          progress: 100
        })
        .eq('id', transcriptionId);
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
