import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FILE_SEARCH_STORE_NAME = 'press-clippings-store';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }
    
    const { query, filters, limit = 10, threshold = 0.5 } = await req.json();
    
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required');
    }

    console.log(`[FileSearch] Searching for: "${query}"`);
    if (filters) {
      console.log(`[FileSearch] Filters:`, filters);
    }

    // Get user's File Search Store ID
    const { data: userDocs } = await supabase
      .from('press_file_search_documents')
      .select('file_search_store_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    const storeId = userDocs?.file_search_store_id || await getDefaultFileSearchStore();

    // Build metadata filter
    let metadataFilter = '';
    if (filters?.publication_name) {
      metadataFilter = `publication_name="${filters.publication_name}"`;
    }
    if (filters?.clients && filters.clients.length > 0) {
      const clientFilter = filters.clients.map((c: string) => `clients HAS "${c}"`).join(' OR ');
      metadataFilter = metadataFilter ? `${metadataFilter} AND (${clientFilter})` : clientFilter;
    }

    const searchPrompt = `Busca artículos sobre: "${query}"

Proporciona resultados relevantes ordenados por importancia.

Para cada artículo encontrado:
1. **Título del artículo**
2. **Resumen (2-3 oraciones)** explicando por qué es relevante
3. **Categoría**
4. **Página** donde aparece (si está disponible)
5. **Publicación** de origen
6. **Keywords relevantes**
7. **Clientes mencionados**
8. **Relevancia** (0.0 a 1.0)

Máximo ${limit} resultados.

Responde ÚNICAMENTE en JSON:
{
  "results": [
    {
      "title": "...",
      "summary": "...",
      "category": "...",
      "page_number": 1,
      "publication_name": "...",
      "keywords": ["..."],
      "clients": ["..."],
      "relevance_score": 0.95
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: searchPrompt }]
          }],
          tools: [{
            file_search: {
              file_search_store_names: [storeId],
              ...(metadataFilter && { metadata_filter: metadataFilter })
            }
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    
    if (!content) {
      throw new Error('No search results');
    }

    const parsed = JSON.parse(content);
    const results = parsed.results || [];

    // Filter by threshold
    const filteredResults = results.filter((r: any) => 
      (r.relevance_score || 0.8) >= threshold
    );

    // Enhance results with citations
    const enhancedResults = filteredResults.map((result: any, index: number) => ({
      id: `fs-${Date.now()}-${index}`,
      title: result.title,
      content: result.summary,
      category: result.category,
      page_number: result.page_number,
      publication_name: result.publication_name,
      keywords: result.keywords || [],
      client_relevance: result.clients || [],
      similarity: result.relevance_score || 0.8,
      citations: groundingMetadata?.groundingChunks?.[index] || null
    }));

    console.log(`[FileSearch] ✓ Found ${enhancedResults.length} results`);

    return new Response(
      JSON.stringify({
        results: enhancedResults,
        total: enhancedResults.length,
        groundingMetadata
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[FileSearch] Search error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getDefaultFileSearchStore(): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${GEMINI_API_KEY}`,
    { method: 'GET' }
  );

  if (response.ok) {
    const stores = await response.json();
    const store = stores.fileSearchStores?.find(
      (s: any) => s.displayName === FILE_SEARCH_STORE_NAME
    );
    if (store) return store.name;
  }

  throw new Error('No File Search Store found');
}
