
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
    console.log('[analyze-tv-content] Request received');
    
    // Create Supabase client with proper configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[analyze-tv-content] Missing Supabase configuration');
      throw new Error('Configuración de Supabase no disponible');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[analyze-tv-content] No authorization header');
      throw new Error('Token de autorización requerido');
    }

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[analyze-tv-content] Auth error:', authError);
      throw new Error('Usuario no autenticado');
    }

    console.log('[analyze-tv-content] User authenticated:', user.id);

    const { 
      transcriptionText, 
      transcriptId, 
      categories = [], 
      clients = [],
      videoPath,
      analysisType = 'gemini',
      enhancedMode = true
    } = await req.json();

    console.log('[analyze-tv-content] Processing request:', {
      hasTranscriptionText: !!transcriptionText,
      hasVideoPath: !!videoPath,
      transcriptId,
      analysisType,
      categoriesCount: categories.length,
      clientsCount: clients.length,
      enhancedMode
    });

    // Validate we have something to analyze
    if (!transcriptionText && !videoPath) {
      throw new Error('Se requiere texto de transcripción o ruta de video para el análisis');
    }

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('[analyze-tv-content] Missing Gemini API key');
      throw new Error('Clave API de Google Gemini no configurada');
    }

    // Build the TV-specific prompt
    const prompt = constructTvPrompt(categories, clients, '', !!transcriptionText);
    
    console.log('[analyze-tv-content] Starting Gemini analysis');

    let geminiResponse;
    let analysisResult;

    try {
      if (videoPath && (analysisType === 'video' || analysisType === 'hybrid' || analysisType === 'gemini')) {
        console.log('[analyze-tv-content] Processing video analysis for path:', videoPath);
        
        // Get signed URL for the video file
        const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
          .from('media')
          .createSignedUrl(videoPath, 3600);
        
        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error('[analyze-tv-content] Signed URL error:', signedUrlError);
          
          // Fall back to text-only analysis if video fails
          if (transcriptionText) {
            console.log('[analyze-tv-content] Falling back to text-only analysis');
            analysisType = 'text';
          } else {
            throw new Error('No se pudo acceder al archivo de video y no hay texto disponible');
          }
        } else {
          console.log('[analyze-tv-content] Got signed URL for video');
          
          // For now, let's do text analysis with video context mention
          // The full video upload to Gemini is complex and may be causing timeouts
          if (transcriptionText) {
            const videoContextPrompt = `${prompt}\n\nNota: Este análisis se basa en la transcripción del siguiente video: ${videoPath}\n\nTranscripción:\n${transcriptionText}`;
            
            geminiResponse = await fetch(
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
                          text: videoContextPrompt
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
          } else {
            throw new Error('Análisis de video sin transcripción no está disponible actualmente');
          }
        }
      } else {
        // Text-only analysis
        if (!transcriptionText) {
          throw new Error('Se requiere texto de transcripción para el análisis');
        }
        
        console.log('[analyze-tv-content] Processing text-only analysis');
        const userPrompt = `${prompt}\n\nTranscripción:\n${transcriptionText}`;

        geminiResponse = await fetch(
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
        throw new Error(`Error en la API de Gemini: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      console.log('[analyze-tv-content] Gemini response received');

      if (!geminiData.candidates || geminiData.candidates.length === 0) {
        console.error('[analyze-tv-content] No candidates in Gemini response:', geminiData);
        throw new Error('No se recibió una respuesta válida de Gemini');
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
          parsed: false,
          analysis_type: analysisType
        };
      }

    } catch (geminiError) {
      console.error('[analyze-tv-content] Gemini processing error:', geminiError);
      throw new Error(`Error en el procesamiento con Gemini: ${geminiError.message}`);
    }

    // Store analysis if transcriptId is provided
    if (transcriptId) {
      console.log('[analyze-tv-content] Storing analysis for transcript:', transcriptId);
      
      try {
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
        } else {
          console.log('[analyze-tv-content] Analysis stored successfully');
        }
      } catch (storageError) {
        console.error('[analyze-tv-content] Storage error:', storageError);
        // Continue - analysis was successful
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
    
    // Provide detailed error information for debugging
    const errorResponse = {
      error: error.message || 'Error interno del servidor',
      success: false,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
