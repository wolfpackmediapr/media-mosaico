
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Now, use AssemblyAI to identify news segments within the transcript
    console.log('Processing transcript with AssemblyAI for news segments');
    
    // Create AssemblyAI transcript using the audio file
    const assemblyResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: signedUrlData.signedUrl,
        auto_chapters: true,
        speaker_labels: true,
        entity_detection: true,
        auto_highlights: true,
        summarization: true,
        summary_type: 'paragraph',
        summary_model: 'conversational'
      })
    });

    if (!assemblyResponse.ok) {
      console.error('AssemblyAI creation error:', await assemblyResponse.text());
      // Still return the Whisper result if AssemblyAI fails
      return new Response(
        JSON.stringify({ 
          text: whisperResult.text,
          segments: [{ text: whisperResult.text, start: 0, end: 0 }] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const assemblyJob = await assemblyResponse.json();
    console.log('AssemblyAI job created:', assemblyJob.id);

    // Poll until the transcript is ready
    let transcriptResult;
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
        break;
      } else if (transcriptResult.status === 'error') {
        console.error('AssemblyAI processing error:', transcriptResult.error);
        break;
      }
      
      console.log(`Waiting for AssemblyAI processing... (${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
    }

    // Extract news segments from chapters or create segments based on speakers
    const newsSegments = [];
    
    if (transcriptResult?.status === 'completed') {
      // If chapters are available, use them as segments
      if (transcriptResult.chapters && transcriptResult.chapters.length > 0) {
        console.log(`Using ${transcriptResult.chapters.length} chapters as news segments`);
        newsSegments.push(...transcriptResult.chapters.map(chapter => ({
          headline: chapter.headline || chapter.gist,
          text: chapter.summary || chapter.gist,
          start: chapter.start,
          end: chapter.end,
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

    // If no segments were identified, use the full transcript as a single segment
    if (newsSegments.length === 0) {
      console.log('No segments identified, using full transcript as single segment');
      newsSegments.push({
        headline: 'Transcripción completa',
        text: whisperResult.text,
        start: 0,
        end: 0,
      });
    }

    console.log(`Returning ${newsSegments.length} news segments`);
    
    return new Response(
      JSON.stringify({ 
        text: whisperResult.text,
        segments: newsSegments,
        assemblyId: assemblyJob.id
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
