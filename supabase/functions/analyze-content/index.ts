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
    const { text } = await req.json()
    console.log('Analyzing content:', text)

    if (!text) {
      throw new Error('No text provided for analysis')
    }

    // Initialize OpenAI API call
    console.log('Calling GPT-4 for content analysis...')
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a media analysis assistant specialized in analyzing Spanish language news content. 
            Analyze the provided text and extract key information following these aspects:
            - Main topic and subtopics
            - Key entities (people, organizations, locations)
            - Sentiment analysis
            - Important dates or timeframes
            - Potential impact or implications
            - Related topics or contexts
            
            Provide your analysis in Spanish, structured as a JSON object with the following fields:
            {
              "topic": "main topic",
              "subtopics": ["array of subtopics"],
              "entities": {
                "people": ["relevant people"],
                "organizations": ["relevant organizations"],
                "locations": ["relevant locations"]
              },
              "sentiment": {
                "score": "numeric score from -1 to 1",
                "description": "brief description of the sentiment"
              },
              "timeframe": {
                "dates": ["relevant dates"],
                "period": "time period description"
              },
              "impact": ["potential impacts or implications"],
              "related_contexts": ["related topics or contexts"],
              "keywords": ["relevant keywords"]
            }`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await analysisResponse.json();
    const analysis = JSON.parse(result.choices[0].message.content);
    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-content function:', error);
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
    );
  }
});