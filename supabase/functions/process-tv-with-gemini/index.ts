
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      supabase.auth.getUser(token);
    }

    console.log('[process-tv-with-gemini] Processing video path:', videoPath);

    // Step 1: Get signed URL for the video file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('media')
      .createSignedUrl(videoPath, 3600);

    if (signedUrlError) {
      console.error('[process-tv-with-gemini] Error creating signed URL:', signedUrlError);
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    const videoUrl = signedUrlData.signedUrl;
    console.log('[process-tv-with-gemini] Got signed URL for video');

    // Step 2: Upload to Gemini Files API
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    // Download video file
    console.log('[process-tv-with-gemini] Downloading video file');
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoBlob = new Blob([videoBuffer]);

    // Upload to Gemini Files API with proper FormData
    console.log('[process-tv-with-gemini] Uploading to Gemini Files API');
    const formData = new FormData();
    
    // Add metadata as JSON
    const metadata = {
      file: { 
        displayName: 'TV Video Analysis',
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
    console.log('[process-tv-with-gemini] Video uploaded to Gemini:', fileUri);

    // Step 3: Wait for file to be processed
    let fileProcessed = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!fileProcessed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${uploadResult.file.name}?key=${geminiApiKey}`);
      
      if (!statusResponse.ok) {
        console.error('[process-tv-with-gemini] Status check failed:', statusResponse.statusText);
        attempts++;
        continue;
      }
      
      const statusResult = await statusResponse.json();
      console.log('[process-tv-with-gemini] File status:', statusResult.state);
      
      if (statusResult.state === 'ACTIVE') {
        fileProcessed = true;
      } else if (statusResult.state === 'FAILED') {
        throw new Error('File processing failed in Gemini');
      }
      
      attempts++;
    }

    if (!fileProcessed) {
      throw new Error('File processing timeout in Gemini');
    }

    // Step 4: Generate comprehensive analysis with Gemini
    console.log('[process-tv-with-gemini] Generating analysis with Gemini');
    
    const prompt = `
    Analyze this TV news video comprehensively. Provide:
    
    1. TRANSCRIPTION: Complete text transcription of all spoken content
    2. VISUAL ANALYSIS: Description of visual elements, graphics, scenes, people
    3. NEWS SEGMENTS: Break down into news segments with timestamps, headlines, and content
    4. KEYWORDS: Extract important keywords and topics
    5. SUMMARY: Overall summary of the content
    
    Format the response as JSON with this structure:
    {
      "transcription": "full text transcription",
      "visual_analysis": "description of visual elements",
      "segments": [
        {
          "headline": "segment headline",
          "text": "segment content",
          "start": start_time_in_seconds,
          "end": end_time_in_seconds,
          "keywords": ["keyword1", "keyword2"]
        }
      ],
      "keywords": ["overall", "keywords"],
      "summary": "overall summary",
      "analysis": {
        "who": "who was mentioned",
        "what": "what happened", 
        "when": "when it happened",
        "where": "where it happened",
        "why": "why it happened"
      }
    }
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
    console.log('[process-tv-with-gemini] Raw analysis result:', analysisText);

    // Parse the JSON response
    let parsedAnalysis;
    try {
      // Clean up the response if it has markdown formatting
      const cleanJson = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedAnalysis = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('[process-tv-with-gemini] JSON parse error:', parseError);
      console.error('[process-tv-with-gemini] Raw text:', analysisText);
      
      // Fallback: create a basic structure
      parsedAnalysis = {
        transcription: analysisText,
        visual_analysis: "Visual analysis not available due to parsing error",
        segments: [],
        keywords: [],
        summary: "Analysis completed but response format needs adjustment",
        analysis: {
          who: "Not extracted",
          what: "Not extracted", 
          when: "Not extracted",
          where: "Not extracted",
          why: "Not extracted"
        }
      };
    }

    // Step 5: Update transcription record in database
    if (transcriptionId) {
      console.log('[process-tv-with-gemini] Updating transcription record:', transcriptionId);
      
      const { error: updateError } = await supabase
        .from('tv_transcriptions')
        .update({
          transcription_text: parsedAnalysis.transcription,
          status: 'completed',
          progress: 100,
          summary: parsedAnalysis.summary,
          keywords: parsedAnalysis.keywords,
          analysis_summary: parsedAnalysis.summary,
          analysis_quien: parsedAnalysis.analysis?.who,
          analysis_que: parsedAnalysis.analysis?.what,
          analysis_cuando: parsedAnalysis.analysis?.when,
          analysis_donde: parsedAnalysis.analysis?.where,
          analysis_porque: parsedAnalysis.analysis?.why,
          analysis_keywords: parsedAnalysis.keywords,
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptionId);

      if (updateError) {
        console.error('[process-tv-with-gemini] Database update error:', updateError);
        // Don't throw error, just log it as the analysis was successful
      }
    }

    // Step 6: Clean up Gemini file
    try {
      await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${uploadResult.file.name}?key=${geminiApiKey}`, {
        method: 'DELETE'
      });
      console.log('[process-tv-with-gemini] Cleaned up Gemini file');
    } catch (cleanupError) {
      console.warn('[process-tv-with-gemini] Cleanup warning:', cleanupError);
    }

    console.log('[process-tv-with-gemini] Analysis completed successfully');

    return new Response(
      JSON.stringify({
        text: parsedAnalysis.transcription,
        visual_analysis: parsedAnalysis.visual_analysis,
        segments: parsedAnalysis.segments || [],
        keywords: parsedAnalysis.keywords || [],
        summary: parsedAnalysis.summary,
        analysis: parsedAnalysis.analysis,
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
        details: 'Check function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
