
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
    console.log('Starting fetch-sentences process...');
    
    const { transcriptId } = await req.json();

    if (!transcriptId) {
      console.error('Missing required data: transcriptId');
      throw new Error('Missing transcript ID');
    }

    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
      console.error('AssemblyAI API key not found');
      throw new Error('AssemblyAI API key not configured');
    }

    console.log('Fetching sentences for transcript ID:', transcriptId);

    // Fetch sentences from AssemblyAI
    const sentencesResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`,
      {
        headers: {
          'Authorization': assemblyKey,
        },
      }
    );

    if (!sentencesResponse.ok) {
      const errorText = await sentencesResponse.text();
      console.error('Sentences request failed:', errorText);
      throw new Error(`Failed to fetch sentences: ${errorText}`);
    }

    const sentencesData = await sentencesResponse.json();
    console.log(`Retrieved ${sentencesData.sentences?.length || 0} sentences`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentences: sentencesData.sentences || []
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-sentences function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack
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
