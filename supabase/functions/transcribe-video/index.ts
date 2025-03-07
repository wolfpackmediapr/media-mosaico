
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Request received');
    const requestData = await req.json();
    const { videoPath, identifySegments = false } = requestData;
    
    console.log('Video path received:', videoPath);
    console.log('Identify segments:', identifySegments);

    if (!videoPath) {
      throw new Error('Video path is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First check if the file exists in the bucket
    console.log('Checking if file exists in storage');
    
    // Adjust the path parsing based on how your files are stored
    const folderPath = videoPath.split('/')[0] || '';
    const fileName = videoPath.split('/').length > 1 ? videoPath.split('/')[1] : videoPath;
    
    console.log('Folder path:', folderPath);
    console.log('File name:', fileName);
    
    const { data: fileExists, error: fileCheckError } = await supabase
      .storage
      .from('media')
      .list(folderPath, {
        limit: 100,
        search: fileName
      });

    if (fileCheckError) {
      console.error('Error checking file existence:', fileCheckError);
      throw new Error(`Failed to check file existence: ${fileCheckError.message}`);
    }

    console.log('File list response:', fileExists);

    if (!fileExists || fileExists.length === 0) {
      console.error('File not found in storage:', videoPath);
      throw new Error('File not found in storage');
    }

    console.log('File exists in storage, generating signed URL');

    // Generate signed URL for the file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('media')
      .createSignedUrl(videoPath, 60);

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
    }

    if (!signedUrlData?.signedUrl) {
      throw new Error('No signed URL generated');
    }

    console.log('Signed URL generated successfully');

    // Download the file using the signed URL
    console.log('Downloading file from signed URL');
    const fileResponse = await fetch(signedUrlData.signedUrl);
    
    if (!fileResponse.ok) {
      console.error('File download failed:', fileResponse.status, fileResponse.statusText);
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    const fileData = await fileResponse.blob();
    console.log('File downloaded successfully, size:', fileData.size);

    // Prepare form data for OpenAI Whisper API
    console.log('Preparing Whisper API request');
    const formData = new FormData();
    formData.append('file', fileData, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'es');

    // Call OpenAI Whisper API
    console.log('Calling Whisper API');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const transcriptionResult = await whisperResponse.json();
    console.log('Transcription completed successfully');

    let segments = [];
    
    // If segment identification is requested, process the full transcription to identify news segments
    if (identifySegments && transcriptionResult.text) {
      console.log('Identifying news segments in transcription');
      
      try {
        // Call OpenAI to identify segments in the transcription
        const segmentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Eres un experto en análisis de noticias y transcripciones de televisión. 
                Tu tarea es identificar y separar diferentes segmentos de noticias dentro de una transcripción.
                
                Para cada segmento de noticia que identifiques, debes proporcionar:
                1. Un título descriptivo
                2. El texto completo del segmento
                3. Una categoría (Política, Economía, Salud, Deportes, Seguridad, etc.)
                4. Palabras clave relevantes (hasta 5)
                
                Identifica hasta 6 segmentos diferentes dentro de la transcripción. Si hay menos, proporciona solo los que encuentres.
                Si la transcripción parece ser una sola noticia o segmento, devuelve solo un segmento.
                
                Responde usando ÚNICAMENTE JSON con este formato exacto:
                {
                  "segments": [
                    {
                      "title": "Título del segmento 1",
                      "text": "Texto completo del segmento 1",
                      "category": "Categoría",
                      "keywords": ["palabra1", "palabra2", "palabra3"],
                      "startTime": 0,
                      "endTime": 0
                    },
                    ...más segmentos
                  ]
                }`
              },
              {
                role: 'user',
                content: `Identifica los diferentes segmentos de noticias en esta transcripción:\n\n${transcriptionResult.text}`
              }
            ],
            response_format: { type: "json_object" }
          }),
        });

        if (!segmentResponse.ok) {
          const errorText = await segmentResponse.text();
          console.error('Segment identification error:', errorText);
          throw new Error(`Error identifying segments: ${errorText}`);
        }

        const segmentData = await segmentResponse.json();
        console.log('Segment identification response:', segmentData);
        
        if (segmentData.choices && segmentData.choices[0]?.message?.content) {
          try {
            const parsedContent = JSON.parse(segmentData.choices[0].message.content);
            segments = parsedContent.segments || [];
            console.log(`Identified ${segments.length} news segments`);
          } catch (parseError) {
            console.error('Error parsing segment data:', parseError);
            console.log('Raw content:', segmentData.choices[0].message.content);
          }
        }
      } catch (segmentError) {
        console.error('Error identifying segments:', segmentError);
        // If segmentation fails, continue with just the transcription
      }
    }

    try {
      // Update transcription record if it exists
      const { error: updateError } = await supabase
        .from('transcriptions')
        .update({ 
          transcription_text: transcriptionResult.text,
          status: 'completed',
          progress: 100,
          ...(segments.length > 0 ? { 
            assembly_chapters: segments 
          } : {})
        })
        .eq('original_file_path', videoPath);

      if (updateError) {
        console.error('Error updating transcription record:', updateError);
        // Non-critical error, continue
      }
    } catch (dbError) {
      console.error('Database update error:', dbError);
      // Non-critical error, continue
    }

    return new Response(
      JSON.stringify({ 
        text: transcriptionResult.text,
        segments: segments.length > 0 ? segments : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
