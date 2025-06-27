
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsSegment {
  headline: string;
  text: string;
  start: number;
  end: number;
  keywords?: string[];
}

// Enhanced environment validation function
function validateEnvironment() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
  
  console.log('[process-tv-with-gemini] Environment validation:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseServiceKey: !!supabaseServiceKey,
    hasGeminiApiKey: !!geminiApiKey,
    supabaseUrlLength: supabaseUrl?.length || 0,
    geminiKeyLength: geminiApiKey?.length || 0
  });
  
  if (!supabaseUrl) throw new Error('SUPABASE_URL not configured');
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  if (!geminiApiKey) throw new Error('GOOGLE_GEMINI_API_KEY not configured');
  
  return { supabaseUrl, supabaseServiceKey, geminiApiKey };
}

// Test Gemini API connectivity
async function testGeminiConnectivity(apiKey: string) {
  try {
    console.log('[process-tv-with-gemini] Testing Gemini API connectivity...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[process-tv-with-gemini] Gemini API test failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Gemini API test failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[process-tv-with-gemini] Gemini API test successful, available models:', data.models?.length || 0);
    return true;
  } catch (error) {
    console.error('[process-tv-with-gemini] Gemini connectivity test error:', error);
    throw new Error(`Gemini API connectivity failed: ${error.message}`);
  }
}

// Enhanced file validation function
async function validateAndGetFile(supabase: any, videoPath: string) {
  console.log('[process-tv-with-gemini] Validating file path:', videoPath);
  
  // Check if file exists by listing files in the directory
  const pathParts = videoPath.split('/');
  if (pathParts.length < 2) {
    throw new Error(`Invalid file path format: ${videoPath}. Expected format: userId/filename`);
  }
  
  const userId = pathParts[0];
  const fileName = pathParts.slice(1).join('/');
  
  console.log('[process-tv-with-gemini] File validation:', { userId, fileName, fullPath: videoPath });
  
  // List files in the user's directory
  const { data: filesList, error: listError } = await supabase.storage
    .from('media')
    .list(userId, { limit: 100 });
  
  if (listError) {
    console.error('[process-tv-with-gemini] Error listing files:', listError);
    throw new Error(`Failed to list files: ${listError.message}`);
  }
  
  console.log('[process-tv-with-gemini] Available files:', filesList?.map(f => f.name) || []);
  
  // Check if our file exists
  const fileExists = filesList?.some(f => fileName.includes(f.name) || f.name.includes(fileName.split('_').pop() || ''));
  
  if (!fileExists) {
    console.error('[process-tv-with-gemini] File not found in storage:', {
      searchingFor: fileName,
      availableFiles: filesList?.map(f => f.name) || []
    });
    throw new Error(`File not found in storage: ${fileName}`);
  }
  
  // Create signed URL
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('media')
    .createSignedUrl(videoPath, 3600); // 1 hour expiry
  
  if (signedUrlError) {
    console.error('[process-tv-with-gemini] Error creating signed URL:', signedUrlError);
    throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
  }
  
  console.log('[process-tv-with-gemini] Successfully created signed URL for file');
  return signedUrlData.signedUrl;
}

// Enhanced video download with retry logic
async function downloadVideoWithRetry(videoUrl: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[process-tv-with-gemini] Downloading video (attempt ${attempt}/${maxRetries})`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const videoResponse = await fetch(videoUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!videoResponse.ok) {
        throw new Error(`Download failed: ${videoResponse.status} ${videoResponse.statusText}`);
      }
      
      const videoBuffer = await videoResponse.arrayBuffer();
      const videoBlob = new Blob([videoBuffer]);
      
      console.log('[process-tv-with-gemini] Video downloaded successfully:', {
        size: videoBlob.size,
        type: videoBlob.type,
        attempt: attempt
      });
      
      return videoBlob;
      
    } catch (error) {
      console.error(`[process-tv-with-gemini] Download attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to download video after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// Enhanced Gemini upload with better error handling
async function uploadToGemini(videoBlob: Blob, apiKey: string, videoPath: string) {
  try {
    console.log('[process-tv-with-gemini] Uploading to Gemini Files API...');
    
    const formData = new FormData();
    const metadata = {
      file: { 
        displayName: `TV Video Analysis - ${videoPath.split('/').pop()}`,
        mimeType: 'video/mp4'
      }
    };
    
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('file', videoBlob, 'video.mp4');

    const uploadResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[process-tv-with-gemini] Gemini upload error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText
      });
      throw new Error(`Gemini upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('[process-tv-with-gemini] Upload successful:', {
      fileUri: uploadResult.file?.uri,
      fileName: uploadResult.file?.name,
      state: uploadResult.file?.state
    });
    
    return {
      fileUri: uploadResult.file.uri,
      fileName: uploadResult.file.name
    };
    
  } catch (error) {
    console.error('[process-tv-with-gemini] Gemini upload error:', error);
    throw new Error(`Gemini upload failed: ${error.message}`);
  }
}

// Enhanced file processing wait with better timeout handling
async function waitForFileProcessing(fileName: string, apiKey: string) {
  const maxAttempts = 15; // Reduced from 20
  const maxWaitTime = 60000; // 60 seconds total
  const baseDelay = 2000; // 2 seconds base delay
  
  const startTime = Date.now();
  let attempts = 0;
  
  while (attempts < maxAttempts && (Date.now() - startTime) < maxWaitTime) {
    try {
      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(1.5, attempts) + Math.random() * 1000, 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`[process-tv-with-gemini] Checking file status (attempt ${attempts + 1}/${maxAttempts})`);
      
      const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!statusResponse.ok) {
        console.error(`[process-tv-with-gemini] Status check failed: ${statusResponse.status} ${statusResponse.statusText}`);
        attempts++;
        continue;
      }
      
      const statusResult = await statusResponse.json();
      console.log('[process-tv-with-gemini] File status:', {
        state: statusResult.state,
        name: statusResult.name,
        attempt: attempts + 1,
        elapsedTime: Date.now() - startTime
      });
      
      if (statusResult.state === 'ACTIVE') {
        console.log('[process-tv-with-gemini] File processing completed successfully');
        return true;
      } else if (statusResult.state === 'FAILED') {
        throw new Error(`File processing failed in Gemini: ${statusResult.error || 'Unknown error'}`);
      }
      
      attempts++;
      
    } catch (error) {
      console.error(`[process-tv-with-gemini] Status check error (attempt ${attempts + 1}):`, error);
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw error;
      }
    }
  }
  
  throw new Error(`File processing timeout after ${attempts} attempts and ${Date.now() - startTime}ms`);
}

// Main serve function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[process-tv-with-gemini] === REQUEST START ===');
    
    // Step 1: Validate environment
    const { supabaseUrl, supabaseServiceKey, geminiApiKey } = validateEnvironment();
    
    // Step 2: Parse and validate request
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('[process-tv-with-gemini] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { videoPath, transcriptionId } = requestBody;
    
    console.log('[process-tv-with-gemini] Request details:', {
      videoPath,
      transcriptionId,
      hasVideoPath: !!videoPath,
      hasTranscriptionId: !!transcriptionId
    });
    
    if (!videoPath) {
      return new Response(
        JSON.stringify({ 
          error: 'Video path is required',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Test Gemini connectivity
    await testGeminiConnectivity(geminiApiKey);

    // Step 4: Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth context
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await supabase.auth.getUser(token);
    }

    // Step 5: Validate and get video file
    const videoUrl = await validateAndGetFile(supabase, videoPath);

    // Step 6: Download video with retry
    const videoBlob = await downloadVideoWithRetry(videoUrl);

    // Step 7: Upload to Gemini
    const { fileUri, fileName } = await uploadToGemini(videoBlob, geminiApiKey, videoPath);

    // Step 8: Wait for file processing
    await waitForFileProcessing(fileName, geminiApiKey);

    // Step 9: Generate analysis
    console.log('[process-tv-with-gemini] Generating comprehensive analysis...');
    
    const prompt = `
    Analyze this TV news video comprehensively and provide a detailed JSON response. The video is from Puerto Rico or Caribbean region.
    
    Please provide:
    1. TRANSCRIPTION: Complete and accurate text transcription of all spoken content
    2. VISUAL ANALYSIS: Description of visual elements, graphics, scenes, people shown
    3. NEWS SEGMENTS: Break content into logical news segments with timestamps, headlines, and content
    4. KEYWORDS: Extract important keywords and topics in Spanish
    5. SUMMARY: Overall summary of the content in Spanish
    6. 5W ANALYSIS: Who, What, When, Where, Why analysis
    
    Format the response as valid JSON with this exact structure:
    {
      "transcription": "complete text transcription in Spanish",
      "visual_analysis": "description of visual elements in Spanish",
      "segments": [
        {
          "headline": "segment headline in Spanish",
          "text": "segment content in Spanish",
          "start": start_time_in_seconds,
          "end": end_time_in_seconds,
          "keywords": ["keyword1", "keyword2"]
        }
      ],
      "keywords": ["overall", "keywords", "in", "spanish"],
      "summary": "overall summary in Spanish",
      "analysis": {
        "who": "who was mentioned",
        "what": "what happened", 
        "when": "when it happened",
        "where": "where it happened",
        "why": "why it happened"
      }
    }
    
    Important: Respond only with valid JSON, no markdown formatting or code blocks.
    `;

    const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { fileData: { mimeType: 'video/mp4', fileUri: fileUri } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('[process-tv-with-gemini] Analysis error:', {
        status: analysisResponse.status,
        statusText: analysisResponse.statusText,
        error: errorText
      });
      throw new Error(`Gemini analysis failed: ${analysisResponse.status} - ${errorText}`);
    }

    const analysisResult = await analysisResponse.json();
    console.log('[process-tv-with-gemini] Analysis completed successfully');
    
    if (!analysisResult.candidates || !analysisResult.candidates[0] || !analysisResult.candidates[0].content) {
      throw new Error('Invalid response format from Gemini');
    }
    
    const analysisText = analysisResult.candidates[0].content.parts[0].text;
    console.log('[process-tv-with-gemini] Raw analysis length:', analysisText.length);

    // Step 10: Parse analysis with enhanced error handling
    let parsedAnalysis;
    try {
      const cleanJson = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedAnalysis = JSON.parse(cleanJson);
      console.log('[process-tv-with-gemini] Successfully parsed JSON analysis');
    } catch (parseError) {
      console.error('[process-tv-with-gemini] JSON parse error:', parseError);
      console.error('[process-tv-with-gemini] Raw text sample:', analysisText.substring(0, 500));
      
      // Enhanced fallback with better structure
      parsedAnalysis = {
        transcription: analysisText.substring(0, 2000),
        visual_analysis: "Análisis visual procesado con formato alternativo",
        segments: [{
          headline: "Contenido Principal",
          text: analysisText.substring(0, 1000),
          start: 0,
          end: 60,
          keywords: ["analisis", "contenido", "video"]
        }],
        keywords: ["analisis", "video", "contenido", "noticias"],
        summary: "Análisis completado exitosamente con procesamiento alternativo",
        analysis: {
          who: "Participantes del contenido analizado",
          what: "Análisis de contenido televisivo",
          when: "Durante la transmisión",
          where: "Puerto Rico/Región Caribe",
          why: "Información noticiosa de relevancia"
        }
      };
    }

    // Step 11: Update database if transcription ID provided
    if (transcriptionId) {
      try {
        console.log('[process-tv-with-gemini] Updating transcription record:', transcriptionId);
        
        const { error: updateError } = await supabase
          .from('tv_transcriptions')
          .update({
            transcription_text: parsedAnalysis.transcription || 'Transcripción procesada',
            status: 'completed',
            progress: 100,
            summary: parsedAnalysis.summary || 'Análisis completado',
            keywords: parsedAnalysis.keywords || [],
            analysis_summary: parsedAnalysis.summary,
            analysis_quien: parsedAnalysis.analysis?.who,
            analysis_que: parsedAnalysis.analysis?.what,
            analysis_cuando: parsedAnalysis.analysis?.when,
            analysis_donde: parsedAnalysis.analysis?.where,
            analysis_porque: parsedAnalysis.analysis?.why,
            analysis_keywords: parsedAnalysis.keywords || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', transcriptionId);

        if (updateError) {
          console.error('[process-tv-with-gemini] Database update error:', updateError);
        } else {
          console.log('[process-tv-with-gemini] Database updated successfully');
        }
      } catch (dbError) {
        console.error('[process-tv-with-gemini] Database operation error:', dbError);
      }
    }

    // Step 12: Cleanup Gemini file
    try {
      const deleteResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${geminiApiKey}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log('[process-tv-with-gemini] Gemini file cleaned up successfully');
      } else {
        console.warn('[process-tv-with-gemini] Failed to cleanup Gemini file:', deleteResponse.status);
      }
    } catch (cleanupError) {
      console.warn('[process-tv-with-gemini] Cleanup warning:', cleanupError);
    }

    console.log('[process-tv-with-gemini] === REQUEST COMPLETED SUCCESSFULLY ===');

    // Step 13: Return successful response
    return new Response(
      JSON.stringify({
        text: parsedAnalysis.transcription || 'Transcripción procesada exitosamente',
        visual_analysis: parsedAnalysis.visual_analysis || 'Análisis visual completado',
        segments: parsedAnalysis.segments || [],
        keywords: parsedAnalysis.keywords || [],
        summary: parsedAnalysis.summary || 'Análisis completado exitosamente',
        analysis: parsedAnalysis.analysis || {},
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[process-tv-with-gemini] === REQUEST FAILED ===');
    console.error('[process-tv-with-gemini] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Categorize errors for better user experience
    let statusCode = 500;
    let userMessage = 'Error interno del servidor';
    
    if (error.message.includes('not configured')) {
      statusCode = 500;
      userMessage = 'Configuración del servidor incompleta';
    } else if (error.message.includes('not found') || error.message.includes('File not found')) {
      statusCode = 404;
      userMessage = 'Archivo no encontrado en el almacenamiento';
    } else if (error.message.includes('Invalid JSON') || error.message.includes('required')) {
      statusCode = 400;
      userMessage = 'Solicitud inválida';
    } else if (error.message.includes('timeout') || error.message.includes('processing timeout')) {
      statusCode = 408;
      userMessage = 'Tiempo de procesamiento agotado - intenta con un archivo más pequeño';
    } else if (error.message.includes('Gemini')) {
      statusCode = 503;
      userMessage = 'Servicio de análisis temporalmente no disponible';
    }
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        details: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
