
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Generates embedding for text content using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI Embedding API error:", error);
      throw new Error(`OpenAI Embedding API error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify that we have an authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { query, filters, limit = 10, threshold = 0.5 } = await req.json();
    
    if (!query || query.trim() === '') {
      return new Response(JSON.stringify({ error: 'Search query is required' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for similar press clippings using the match_press_clippings function
    let { data: clippings, error } = await supabase.rpc(
      'match_press_clippings',
      { 
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      }
    );
    
    if (error) {
      console.error('Error searching press clippings:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Apply additional filters if provided
    if (filters) {
      if (filters.category) {
        clippings = clippings.filter(clip => clip.category === filters.category);
      }
      
      if (filters.publicationName) {
        clippings = clippings.filter(clip => clip.publication_name === filters.publicationName);
      }
      
      if (filters.dateRange && filters.dateRange.from && filters.dateRange.to) {
        const from = new Date(filters.dateRange.from);
        const to = new Date(filters.dateRange.to);
        
        clippings = clippings.filter(clip => {
          const clipDate = new Date(clip.publication_date);
          return clipDate >= from && clipDate <= to;
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      clippings
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('Error searching press clippings:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error occurred' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
