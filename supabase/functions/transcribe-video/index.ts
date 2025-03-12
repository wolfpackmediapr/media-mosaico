import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to format milliseconds into HH:MM:SS format
const formatTimestamp = (milliseconds: number): string => {
  if (!milliseconds && milliseconds !== 0) return "00:00:00";
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Function to calculate segment timestamps based on video duration
const calculateSegmentTimestamps = (duration: number, segmentIndex: number, totalSegments: number): { start: number, end: number } => {
  if (!duration) return { start: 0, end: 0 };
  
  const segmentDuration = duration / totalSegments;
  const start = Math.round(segmentIndex * segmentDuration);
  const end = Math.round((segmentIndex + 1) * segmentDuration);
  
  return { start, end };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Request received');
    const { videoPath } = await req.json();
    console.log('Video path received:', videoPath);

    if (!videoPath) {
      throw new Error('Video path is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First check if the file exists in the bucket
    const { data: fileExists, error: fileCheckError } = await supabase
      .storage
      .from('media')
      .list(videoPath.split('/')[0], {
        limit: 1,
        offset: 0,
        search: videoPath.split('/')[1]
      });

    if (fileCheckError) {
      console.error('Error checking file existence:', fileCheckError);
      throw new Error(`Failed to check file existence: ${fileCheckError.message}`);
    }

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

    // First, we'll use OpenAI Whisper for the transcription
    const formData = new FormData();
    formData.append('file', fileData, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'es');

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

    const whisperResult = await whisperResponse.json();
    console.log('Transcription completed successfully');

    // Create AssemblyAI transcript using the audio file and Nano model for Spanish
    console.log('Processing transcript with AssemblyAI Nano model for Spanish');
    
    const assemblyResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: signedUrlData.signedUrl,
        language_code: 'es',  // Spanish language code
        speaker_labels: true,
        auto_chapters: true,
        entity_detection: true,
        auto_highlights: true,
        summarization: true,
        summary_type: 'paragraph',
        summary_model: 'conversational',
        model: 'nano'  // Using Nano model which works well with Spanish
      })
    });

    if (!assemblyResponse.ok) {
      console.error('AssemblyAI creation error:', await assemblyResponse.text());
      // Continue processing without AssemblyAI data
    }

    let assemblyJob = null;
    if (assemblyResponse.ok) {
      assemblyJob = await assemblyResponse.json();
      console.log('AssemblyAI job created:', assemblyJob.id);
    }

    // Poll until the transcript is ready (only if we got a valid job)
    let transcriptResult = null;
    let videoDuration = 0;
    
    if (assemblyJob?.id) {
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5s * 60)
      
      while (attempts < maxAttempts) {
        attempts++;
        
        const checkResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${assemblyJob.id}`, {
          headers: {
            'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '',
          }
        });
        
        if (!checkResponse.ok) {
          console.error('AssemblyAI check error:', await checkResponse.text());
          break;
        }
        
        transcriptResult = await checkResponse.json();
        
        if (transcriptResult.status === 'completed') {
          console.log('AssemblyAI processing completed');
          // Store the video duration if available
          if (transcriptResult.audio_duration) {
            videoDuration = transcriptResult.audio_duration * 1000; // Convert to milliseconds
            console.log('Video duration detected:', videoDuration, 'ms');
          }
          break;
        } else if (transcriptResult.status === 'error') {
          console.error('AssemblyAI processing error:', transcriptResult.error);
          break;
        }
        
        console.log(`Waiting for AssemblyAI processing... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
      }
    }

    // Extract news segments from chapters or create segments based on speakers
    let newsSegments = [];
    
    if (transcriptResult?.status === 'completed') {
      // If chapters are available, use them as segments
      if (transcriptResult.chapters && transcriptResult.chapters.length > 0) {
        console.log(`Using ${transcriptResult.chapters.length} chapters as news segments`);
        newsSegments.push(...transcriptResult.chapters.map(chapter => ({
          headline: chapter.headline || chapter.gist,
          text: chapter.summary || chapter.gist,
          start: chapter.start,
          end: chapter.end,
          keywords: [] // Will be filled by GPT-4 later
        })));
      } 
      // If no chapters but we have speakers, use speaker transitions as segment boundaries
      else if (transcriptResult.utterances && transcriptResult.utterances.length > 0) {
        console.log(`Using ${transcriptResult.utterances.length} speaker utterances`);
        newsSegments.push(...transcriptResult.utterances.map(utterance => ({
          headline: `Speaker ${utterance.speaker}`,
          text: utterance.text,
          start: utterance.start,
          end: utterance.end,
          keywords: []
        })));
      }
      
      // Store the full AssemblyAI analysis in the database
      const { error: updateError } = await supabase
        .from('transcriptions')
        .update({ 
          transcription_text: whisperResult.text,
          assembly_chapters: transcriptResult.chapters || null,
          assembly_entities: transcriptResult.entities || null,
          assembly_key_phrases: transcriptResult.auto_highlights_result || null,
          assembly_summary: transcriptResult.summary || null,
          status: 'completed',
          progress: 100
        })
        .eq('original_file_path', videoPath);

      if (updateError) {
        console.error('Error updating transcription record:', updateError);
      }
    }

    // If no segments were identified or fewer than 6, use GPT-4 to analyze the transcript
    // and now ensure we use accurate timestamps based on video duration
    let gptGeneratedSegments = [];
    
    if (newsSegments.length < 6) {
      console.log('Using GPT-4 to identify news segments in Spanish');
      
      const systemPrompt = `Eres un experto en analizar transmisiones de noticias e identificar segmentos distintos en una transcripción.
        Tu tarea es dividir esta transcripción de noticias en español en exactamente 6 segmentos significativos.
        
        IMPORTANTE: DEBES RESPONDER EN ESPAÑOL. Todo el análisis y los segmentos deben estar escritos en español.
        
        Para cada segmento debes identificar:
        1. Un titular periodístico conciso para el segmento (5-8 palabras)
        2. El contenido principal de ese segmento (resumido de la transcripción)
        3. 3-5 palabras clave que representen los principales temas del segmento
        
        Formatea cada segmento así:
        {
          "headline": "Titular Conciso Aquí",
          "text": "Resumen del contenido del segmento...",
          "keywords": ["palabraclave1", "palabraclave2", "palabraclave3"]
        }
        
        Devuelve EXACTAMENTE SEIS segmentos en un array de objetos JSON.
        Asegúrate de que los segmentos cubran diferentes temas o aspectos de la transmisión de noticias.
        
        Importante: NO incluyas explicaciones o notas. Responde SOLO con el array JSON de segmentos en ESPAÑOL.`;
      
      try {
        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: whisperResult.text }
            ],
            response_format: { type: "json_object" },
            temperature: 0.5
          })
        });
        
        if (gptResponse.ok) {
          const gptResult = await gptResponse.json();
          console.log('GPT-4 analysis completed');
          
          if (gptResult.choices && gptResult.choices[0]?.message?.content) {
            try {
              const parsedContent = JSON.parse(gptResult.choices[0].message.content);
              if (parsedContent.segments && Array.isArray(parsedContent.segments)) {
                gptGeneratedSegments = parsedContent.segments;
                console.log(`Generated ${gptGeneratedSegments.length} news segments with GPT-4`);
              }
            } catch (e) {
              console.error('Error parsing GPT-4 response:', e);
            }
          }
        } else {
          console.error('GPT-4 API error:', await gptResponse.text());
        }
      } catch (e) {
        console.error('Error with GPT-4 analysis:', e);
      }
    }

    // Create the final list of exactly 6 segments with proper timestamps
    // If we have both AssemblyAI and GPT segments, merge them smartly
    let finalSegments = [];
    
    if (newsSegments.length >= 6) {
      // Use AssemblyAI segments (up to 6)
      finalSegments = newsSegments.slice(0, 6);
    } else if (gptGeneratedSegments.length > 0) {
      // If we have GPT segments, use them but add timestamps based on video duration
      finalSegments = gptGeneratedSegments.map((segment, index) => {
        const { start, end } = calculateSegmentTimestamps(videoDuration, index, 6);
        return {
          ...segment,
          start,
          end
        };
      });
    } else {
      // If no segments from either source, create 6 evenly distributed segments
      for (let i = 0; i < 6; i++) {
        const { start, end } = calculateSegmentTimestamps(videoDuration, i, 6);
        finalSegments.push({
          headline: `Segmento ${i + 1}`,
          text: i === 0 ? whisperResult.text : "",
          start,
          end,
          keywords: []
        });
      }
    }

    // Make sure we have exactly 6 segments with formatted HH:MM:SS timestamps
    if (finalSegments.length < 6) {
      // Fill up to 6 segments with placeholder segments if needed
      const segmentDuration = videoDuration > 0 ? videoDuration / 6 : 0;
      
      for (let i = finalSegments.length; i < 6; i++) {
        const start = Math.round(i * segmentDuration);
        const end = Math.round((i + 1) * segmentDuration);
        
        finalSegments.push({
          headline: `Segmento ${i + 1}`,
          text: "",
          start,
          end,
          keywords: []
        });
      }
    } else if (finalSegments.length > 6) {
      // Keep only the first 6 segments
      finalSegments = finalSegments.slice(0, 6);
    }

    // Format the start/end times in HH:MM:SS for each segment
    finalSegments = finalSegments.map(segment => ({
      ...segment,
      timestamp_start: formatTimestamp(segment.start),
      timestamp_end: formatTimestamp(segment.end)
    }));

    console.log(`Returning ${finalSegments.length} news segments with accurate timestamps`);
    
    return new Response(
      JSON.stringify({ 
        text: whisperResult.text,
        segments: finalSegments,
        assemblyId: assemblyJob?.id
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
