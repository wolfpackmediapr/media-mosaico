
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import 'https://deno.land/x/xhr@0.1.0/mod.ts'

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
    const { transcriptionText, metadata, type, format } = await req.json()
    console.log('Generating report for:', { 
      metadata, 
      type, 
      format,
      transcriptionLength: transcriptionText?.length || 0 
    })

    if (!transcriptionText || transcriptionText.length < 50) {
      throw new Error('Insufficient transcription text provided')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get OpenAI API key to generate summary and analysis
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Generate summary and analysis using OpenAI
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            "role": "system",
            "content": "You are generating a structured report for a radio broadcast transcription. Please analyze the content and provide a professional summary."
          },
          {
            "role": "user",
            "content": `Analyze this radio transcription and create a structured report with the following sections:
            1. Executive Summary (2-3 sentences)
            2. Key Points (3-5 bullet points)
            3. Primary Topics
            4. Relevant Entities
            5. Tone Analysis
            
            Radio station: ${metadata?.emisora || 'Unknown'}
            Program: ${metadata?.programa || 'Unknown'}
            Time slot: ${metadata?.horario || 'Unknown'}
            
            Transcription: ${transcriptionText}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      })
    })

    const analysisData = await analysisResponse.json()
    
    if (!analysisData.choices || analysisData.choices.length === 0) {
      throw new Error('Failed to generate report content')
    }

    const reportContent = analysisData.choices[0].message.content

    console.log('Generated report content')

    // Get user info from the request authorization header
    const authHeader = req.headers.get('Authorization')
    let userId = 'anonymous'
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError) {
        console.warn('Auth error:', authError)
      } else if (user) {
        userId = user.id
      }
    }

    // Create a report record in the database
    const currentDate = new Date()
    const reportTitle = `Radio Report: ${metadata?.emisora || 'Unknown Station'} - ${metadata?.programa || 'Unknown Program'}`
    
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .insert({
        title: reportTitle,
        type: 'radio',
        format: format || 'text',
        date_range: `[${currentDate.toISOString()}, ${currentDate.toISOString()}]`,
        user_id: userId,
        status: 'completed',
        data: {
          metadata,
          content: reportContent,
          station: metadata?.emisora,
          program: metadata?.programa,
          timeSlot: metadata?.horario,
          category: metadata?.categoria,
          generatedAt: currentDate.toISOString()
        }
      })
      .select('id')

    if (reportError) {
      console.error('Error saving report:', reportError)
      throw new Error('Failed to save report to database')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        reportContent,
        reportId: reportData?.[0]?.id
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in generate-radio-report function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
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
