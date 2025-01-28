import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audioFile') as File
    const userId = formData.get('userId') as string

    if (!audioFile || !userId) {
      return new Response(
        JSON.stringify({ error: 'Audio file and user ID are required' }),
        { status: 400 }
      )
    }

    console.log('Starting transcription process for file:', audioFile.name)

    // Upload to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY!
      },
      body: await audioFile.arrayBuffer()
    })

    const uploadData = await uploadResponse.json()
    const audioUrl = uploadData.upload_url

    // Start transcription with all analysis features enabled
    const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        summarization: true,
        summary_model: "informative",
        summary_type: "bullets",
        content_safety: true,
        sentiment_analysis: true,
        entity_detection: true,
        iab_categories: true,
        auto_chapters: true,
        auto_highlights: true
      })
    })

    const transcribeData = await transcribeResponse.json()
    const transcriptId = transcribeData.id

    // Poll for completion
    let transcript
    while (true) {
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            'Authorization': ASSEMBLYAI_API_KEY!
          }
        }
      )
      transcript = await pollingResponse.json()
      
      if (transcript.status === 'completed' || transcript.status === 'error') {
        break
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`)
    }

    // Update Supabase with transcription and analysis results
    const supabaseClient = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: updateError } = await supabaseClient
      .from('transcriptions')
      .update({
        transcription_text: transcript.text,
        status: 'completed',
        assembly_summary: transcript.summary,
        assembly_content_safety: transcript.content_safety_labels,
        assembly_sentiment_analysis: transcript.sentiment_analysis_results,
        assembly_entities: transcript.entities,
        assembly_topics: transcript.iab_categories_result,
        assembly_chapters: transcript.chapters,
        assembly_key_phrases: transcript.auto_highlights_result
      })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ text: transcript.text }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})