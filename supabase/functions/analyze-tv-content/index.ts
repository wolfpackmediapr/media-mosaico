
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { constructTvPrompt } from './tvPromptBuilder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      supabaseClient.auth.setAuth(authHeader.replace('Bearer ', ''));
    }

    const { 
      transcriptionText, 
      transcriptId, 
      categories = [], 
      clients = [],
      videoPath,
      analysisType = 'text' // 'text' | 'video' | 'hybrid'
    } = await req.json();

    console.log('[analyze-tv-content] Processing request:', {
      hasTranscriptionText: !!transcriptionText,
      hasVideoPath: !!videoPath,
      transcriptId,
      analysisType,
      categoriesCount: categories.length,
      clientsCount: clients.length
    });

    // Validate input based on analysis type
    if (analysisType === 'text' && !transcriptionText) {
      throw new Error('El texto de transcripción es requerido para análisis de texto');
    }
    
    if ((analysisType === 'video' || analysisType === 'hybrid') && !videoPath) {
      throw new Error('La ruta del video es requerida para análisis de video');
    }

    // Build the TV-specific prompt
    const prompt = constructTvPrompt(categories, clients, '', !!transcriptionText);
    
    console.log('[analyze-tv-content] Calling Google Gemini API with analysis type:', analysisType);

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Google Gemini API key not configured');
    }

    let geminiResponse;
    let analysisResult;

    if (analysisType === 'video' || analysisType === 'hybrid') {
      // First upload video to Gemini Files API if needed
      let fileUri = null;
      
      if (videoPath) {
        console.log('[analyze-tv-content] Uploading video to Gemini Files API');
        
        // Get signed URL for the video
        const { data: signedUrlData } = await supabaseClient.storage
          .from('media')
          .createSignedUrl(videoPath, 3600);
        
        if (!signedUrlData?.signedUrl) {
          throw new Error('No se pudo generar URL firmada para el video');
        }

        // Download video data
        const videoResponse = await fetch(signedUrlData.signedUrl);
        if (!videoResponse.ok) {
          throw new Error('No se pudo descargar el video desde el almacenamiento');
        }
        
        const videoBlob = await videoResponse.blob();
        const videoBase64 = btoa(String.fromCharCode(...new Uint8Array(await videoBlob.arrayBuffer())));

        // Upload to Gemini Files API
        const uploadResponse = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${geminiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: {
              displayName: `tv-analysis-${transcriptId || Date.now()}`,
              mimeType: 'video/mp4'
            }
          })
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.text();
          console.error('[analyze-tv-content] Upload init error:', uploadError);
          throw new Error('Error al inicializar subida de video a Gemini');
        }

        const uploadData = await uploadResponse.json();
        const uploadUrl = uploadData.file.uri;

        // Upload the actual video data
        const dataUploadResponse = await fetch(uploadUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${geminiApiKey}`,
            'Content-Type': 'video/mp4',
          },
          body: videoBase64
        });

        if (!dataUploadResponse.ok) {
          throw new Error('Error al subir datos del video a Gemini');
        }

        fileUri = uploadData.file.name;
        console.log('[analyze-tv-content] Video uploaded to Gemini with URI:', fileUri);
      }

      // Prepare content for analysis
      const contents = [{
        parts: []
      }];

      // Add video if available
      if (fileUri) {
        contents[0].parts.push({
          fileData: {
            fileUri: fileUri,
            mimeType: 'video/mp4'
          }
        });
      }

      // Add transcription text if available (hybrid mode)
      if (analysisType === 'hybrid' && transcriptionText) {
        contents[0].parts.push({
          text: `Transcripción del audio:\n${transcriptionText}\n\n`
        });
      }

      // Add the analysis prompt
      contents[0].parts.push({
        text: prompt
      });

      // Call Gemini with video content
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: contents,
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

    } else {
      // Text-only analysis (existing functionality)
      const userPrompt = `${prompt}\n\nTranscripción:\n${transcriptionText}`;

      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
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
                    text: userPrompt
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
    }

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[analyze-tv-content] Gemini API error:', errorText);
      throw new Error(`Error en la API de Gemini: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('[analyze-tv-content] Gemini response received');

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('No se recibió respuesta válida de Gemini');
    }

    const rawAnalysis = geminiData.candidates[0].content.parts[0].text;
    
    // Try to parse as JSON, fallback to text if needed
    try {
      analysisResult = JSON.parse(rawAnalysis);
      console.log('[analyze-tv-content] Successfully parsed JSON response');
    } catch (parseError) {
      console.warn('[analyze-tv-content] Failed to parse JSON, using raw text:', parseError);
      analysisResult = { 
        raw_analysis: rawAnalysis,
        parsed: false 
      };
    }

    // Store analysis if transcriptId is provided
    if (transcriptId) {
      console.log('[analyze-tv-content] Storing analysis for transcript:', transcriptId);
      
      const analysisToStore = typeof analysisResult === 'object' 
        ? JSON.stringify(analysisResult)
        : analysisResult;
      
      const { error: updateError } = await supabaseClient
        .from('tv_transcriptions')
        .update({
          analysis_result: analysisToStore,
          analyzed_at: new Date().toISOString(),
          analysis_type: analysisType
        })
        .eq('id', transcriptId);

      if (updateError) {
        console.error('[analyze-tv-content] Error storing analysis:', updateError);
        // Don't throw here - analysis was successful, storage is secondary
      }
    }

    console.log('[analyze-tv-content] Analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        analysis: analysisResult,
        analysisType: analysisType,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[analyze-tv-content] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
