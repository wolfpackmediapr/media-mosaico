
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[process-tv-with-gemini] Request received');
    
    // Parse request body with better error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('[process-tv-with-gemini] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { videoPath, transcriptionId } = requestBody;
    
    if (!videoPath) {
      throw new Error('Video path is required');
    }

    console.log('[process-tv-with-gemini] Processing video path:', videoPath);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await supabase.auth.getUser(token);
    }

    // Step 1: Get signed URL for the video file with better error handling
    console.log('[process-tv-with-gemini] Creating signed URL for video path:', videoPath);
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('media')
      .createSignedUrl(videoPath, 3600);

    if (signedUrlError) {
      console.error('[process-tv-with-gemini] Error creating signed URL:', signedUrlError);
      
      // Try to list files to debug the issue
      const pathParts = videoPath.split('/');
      const userId = pathParts[0];
      console.log('[process-tv-with-gemini] Attempting to list files for user:', userId);
      
      const { data: filesList, error: listError } = await supabase.storage
        .from('media')
        .list(userId, { limit: 10 });
      
      if (listError) {
        console.error('[process-tv-with-gemini] Error listing files:', listError);
      } else {
        console.log('[process-tv-with-gemini] Available files:', filesList?.map(f => f.name));
      }
      
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    const videoUrl = signedUrlData.signedUrl;
    console.log('[process-tv-with-gemini] Got signed URL for video');

    // Step 2: Upload to Gemini Files API
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    // Download video file with timeout
    console.log('[process-tv-with-gemini] Downloading video file');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for download
    
    let videoResponse;
    try {
      videoResponse = await fetch(videoUrl, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[process-tv-with-gemini] Video download failed:', fetchError);
      throw new Error(`Failed to download video: ${fetchError.message}`);
    }
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoBlob = new Blob([videoBuffer]);
    console.log('[process-tv-with-gemini] Video downloaded, size:', videoBlob.size, 'bytes');

    // Upload to Gemini Files API with proper FormData
    console.log('[process-tv-with-gemini] Uploading to Gemini Files API');
    const formData = new FormData();
    
    // Add metadata as JSON
    const metadata = {
      file: { 
        displayName: `TV Video Analysis - ${videoPath}`,
        mimeType: 'video/mp4'
      }
    };
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('file', videoBlob, 'video.mp4');

    const uploadResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[process-tv-with-gemini] Upload error:', errorText);
      throw new Error(`Failed to upload to Gemini: ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileUri = uploadResult.file.uri;
    const fileName = uploadResult.file.name;
    console.log('[process-tv-with-gemini] Video uploaded to Gemini:', fileUri);

    // Step 3: Wait for file to be processed with improved timeout handling
    let fileProcessed = false;
    let attempts = 0;
    const maxAttempts = 20; // Reduced from 30 to prevent long timeouts
    const maxWaitTime = 45000; // 45 seconds total wait time
    const startTime = Date.now();

    while (!fileProcessed && attempts < maxAttempts && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${geminiApiKey}`);
        
        if (!statusResponse.ok) {
          console.error('[process-tv-with-gemini] Status check failed:', statusResponse.statusText);
          attempts++;
          continue;
        }
        
        const statusResult = await statusResponse.json();
        console.log('[process-tv-with-gemini] File status:', statusResult.state, 'attempt:', attempts + 1);
        
        if (statusResult.state === 'ACTIVE') {
          fileProcessed = true;
        } else if (statusResult.state === 'FAILED') {
          throw new Error('File processing failed in Gemini');
        }
        
        attempts++;
      } catch (statusError) {
        console.error('[process-tv-with-gemini] Status check error:', statusError);
        attempts++;
      }
    }

    if (!fileProcessed) {
      console.error('[process-tv-with-gemini] File processing timeout after', attempts, 'attempts and', Date.now() - startTime, 'ms');
      
      // Clean up the uploaded file
      try {
        await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${geminiApiKey}`, {
          method: 'DELETE'
        });
      } catch (cleanupError) {
        console.warn('[process-tv-with-gemini] Cleanup error:', cleanupError);
      }
      
      throw new Error('Video processing timeout - please try with a smaller video file or try again later');
    }

    // Step 4: Generate comprehensive analysis with Gemini
    console.log('[process-tv-with-gemini] Generating analysis with Gemini');
    
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
      console.error('[process-tv-with-gemini] Analysis error:', errorText);
      throw new Error(`Gemini analysis failed: ${analysisResponse.statusText}`);
    }

    const analysisResult = await analysisResponse.json();
    console.log('[process-tv-with-gemini] Analysis result received');
    
    if (!analysisResult.candidates || !analysisResult.candidates[0] || !analysisResult.candidates[0].content) {
      throw new Error('Invalid response format from Gemini');
    }
    
    const analysisText = analysisResult.candidates[0].content.parts[0].text;
    console.log('[process-tv-with-gemini] Raw analysis length:', analysisText.length, 'characters');

    // Parse the JSON response with better error handling
    let parsedAnalysis;
    try {
      // Clean up the response if it has markdown formatting
      const cleanJson = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedAnalysis = JSON.parse(cleanJson);
      console.log('[process-tv-with-gemini] Successfully parsed JSON response');
    } catch (parseError) {
      console.error('[process-tv-with-gemini] JSON parse error:', parseError);
      console.error('[process-tv-with-gemini] Raw text snippet:', analysisText.substring(0, 500));
      
      // Fallback: create a basic structure with the raw text
      parsedAnalysis = {
        transcription: analysisText.substring(0, 2000), // Use first part as transcription
        visual_analysis: "Visual analysis extracted from response",
        segments: [{
          headline: "Contenido Principal",
          text: analysisText.substring(0, 1000),
          start: 0,
          end: 60,
          keywords: ["analisis", "contenido"]
        }],
        keywords: ["analisis", "video", "contenido"],
        summary: "Análisis completado con formato alternativo",
        analysis: {
          who: "Información extraída del análisis",
          what: "Análisis de contenido televisivo",
          when: "Durante la transmisión",
          where: "Puerto Rico/Caribe",
          why: "Información noticiosa relevante"
        }
      };
    }

    // Step 5: Update transcription record in database
    if (transcriptionId) {
      console.log('[process-tv-with-gemini] Updating transcription record:', transcriptionId);
      
      const { error: updateError } = await supabase
        .from('tv_transcriptions')
        .update({
          transcription_text: parsedAnalysis.transcription || 'Transcripción no disponible',
          status: 'completed',
          progress: 100,
          summary: parsedAnalysis.summary || 'Resumen no disponible',
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
        // Don't throw error, just log it as the analysis was successful
      } else {
        console.log('[process-tv-with-gemini] Database updated successfully');
      }
    }

    // Step 6: Clean up Gemini file
    try {
      await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${geminiApiKey}`, {
        method: 'DELETE'
      });
      console.log('[process-tv-with-gemini] Cleaned up Gemini file');
    } catch (cleanupError) {
      console.warn('[process-tv-with-gemini] Cleanup warning:', cleanupError);
    }

    console.log('[process-tv-with-gemini] Analysis completed successfully');

    return new Response(
      JSON.stringify({
        text: parsedAnalysis.transcription || 'Transcripción no disponible',
        visual_analysis: parsedAnalysis.visual_analysis || 'Análisis visual no disponible',
        segments: parsedAnalysis.segments || [],
        keywords: parsedAnalysis.keywords || [],
        summary: parsedAnalysis.summary || 'Análisis completado',
        analysis: parsedAnalysis.analysis || {},
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[process-tv-with-gemini] Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
