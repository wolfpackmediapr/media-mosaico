
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
      throw new Error('Missing transcript ID');
    }

    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    console.log(`Fetching utterances for transcript ${transcriptId}...`);
    
    // Fetch the utterances from AssemblyAI API
    const utterancesResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}/utterances`,
      {
        headers: {
          'Authorization': assemblyKey,
        },
      }
    );

    if (!utterancesResponse.ok) {
      const errorText = await utterancesResponse.text();
      throw new Error(`Failed to fetch utterances: ${errorText}`);
    }

    const utterancesData = await utterancesResponse.json();
    const utterances = utterancesData.utterances || [];
    
    console.log(`Retrieved ${utterances.length} utterances`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        utterances 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-utterances function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
