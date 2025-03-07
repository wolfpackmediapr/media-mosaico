
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
    const { videoPath, identifySegments = false } = await req.json()
    console.log('Processing video transcription:', videoPath, 'with segments:', identifySegments)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get signed URL for video file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('media')
      .createSignedUrl(videoPath, 60)

    if (signedUrlError) {
      console.error('Error getting signed URL:', signedUrlError)
      throw new Error('Failed to get video file URL')
    }

    // Initialize AssemblyAI
    const assemblyAiApiKey = Deno.env.get('ASSEMBLYAI_API_KEY')
    if (!assemblyAiApiKey) {
      throw new Error('AssemblyAI API key not configured')
    }

    // Start transcription
    console.log('Starting AssemblyAI transcription with URL:', signedUrlData.signedUrl)
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyAiApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: signedUrlData.signedUrl,
        speaker_labels: true,
        auto_chapters: true,
        entity_detection: true,
        summarization: true,
        auto_highlights: true,
        iab_categories: true,
        content_safety: true,
        language_code: 'es'
      })
    })

    if (!transcriptResponse.ok) {
      const error = await transcriptResponse.text()
      console.error('AssemblyAI transcription request failed:', error)
      throw new Error('Failed to start transcription')
    }

    const transcriptData = await transcriptResponse.json()
    const transcriptId = transcriptData.id
    console.log('Transcription started with ID:', transcriptId)

    // Poll for completion
    let transcript
    let complete = false
    
    while (!complete) {
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { 'Authorization': assemblyAiApiKey }
      })
      
      if (!pollingResponse.ok) {
        throw new Error('Failed to check transcription status')
      }
      
      transcript = await pollingResponse.json()
      console.log('Transcript status:', transcript.status)
      
      if (['completed', 'error'].includes(transcript.status)) {
        complete = true
      }
    }

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`)
    }

    // Process transcript for news segments if requested
    let segments = []
    if (identifySegments && transcript.chapters && transcript.chapters.length > 0) {
      console.log('Processing transcript chapters as news segments')
      segments = transcript.chapters.map((chapter: any) => ({
        title: chapter.headline,
        text: chapter.summary,
        startTime: chapter.start,
        endTime: chapter.end,
        keywords: chapter.gist.split(',').map((k: string) => k.trim())
      }))
    }

    // Update transcription in database
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        transcription_text: transcript.text,
        status: 'completed',
        assembly_chapters: transcript.chapters,
        assembly_topics: transcript.iab_categories_result,
        assembly_key_phrases: transcript.auto_highlights_result,
        assembly_entities: transcript.entities,
        assembly_sentiment_analysis: transcript.sentiment_analysis_results,
        assembly_content_safety: transcript.content_safety_labels,
        assembly_summary: transcript.summary
      })
      .eq('original_file_path', videoPath)

    if (updateError) {
      console.error('Error updating transcription record:', updateError)
    }

    console.log('Transcription complete and saved to database')

    return new Response(
      JSON.stringify({ 
        text: transcript.text,
        segments: segments,
        chapters: transcript.chapters,
        topics: transcript.iab_categories_result,
        contentSafety: transcript.content_safety_labels,
        summary: transcript.summary
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in transcribe-video function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
