
// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcriptId } = await req.json();
    
    if (!transcriptId) {
      throw new Error('Transcript ID is required');
    }

    console.log(`Fetching utterances for transcript ${transcriptId}...`);
    
    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    const response = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: {
          'Authorization': assemblyKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch utterances: ${errorText}`);
    }

    const transcript = await response.json();
    
    // Check if we have utterances in the transcript
    if (transcript.utterances && transcript.utterances.length > 0) {
      console.log(`Found ${transcript.utterances.length} utterances`);
      
      // Format the utterances to match our expected structure
      const formattedUtterances = transcript.utterances.map((utterance: any) => ({
        text: utterance.text,
        speaker: utterance.speaker,
        start: utterance.start,
        end: utterance.end,
        confidence: utterance.confidence
      }));
      
      return new Response(
        JSON.stringify({ 
          success: true,
          utterances: formattedUtterances,
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } else {
      console.log('No utterances found in transcript');
      return new Response(
        JSON.stringify({ 
          success: true,
          utterances: [],
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
  } catch (error) {
    console.error('Error in fetch-utterances function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
