import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Client {
  id: string;
  name: string;
  keywords: string[] | null;
}

interface AnalysisResult {
  summary: string;
  category: string;
  clients: Array<{ id: string; name: string; relevance: string }>;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentiment_score: number;
}

// Fetch all clients with keywords from database
async function fetchClients(supabase: any): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, keywords')
      .not('keywords', 'is', null);
    
    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('Error in fetchClients:', e);
    return [];
  }
}

// Match article content against client keywords
function matchClientsToArticle(
  title: string, 
  description: string, 
  clients: Client[]
): Array<{ id: string; name: string; matchedKeywords: string[] }> {
  const content = `${title} ${description}`.toLowerCase();
  const matches: Array<{ id: string; name: string; matchedKeywords: string[] }> = [];
  
  for (const client of clients) {
    if (!client.keywords || client.keywords.length === 0) continue;
    
    const matchedKeywords = client.keywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    if (matchedKeywords.length > 0) {
      matches.push({
        id: client.id,
        name: client.name,
        matchedKeywords
      });
    }
  }
  
  return matches;
}

function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[`'"]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/&[a-zA-Z0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);
}

async function analyzeArticle(
  title: string, 
  description: string, 
  lovableApiKey: string,
  clients: Client[]
): Promise<AnalysisResult> {
  const sanitizedTitle = sanitizeText(title);
  const sanitizedDescription = sanitizeText(description);
  
  // Pre-match clients based on keywords
  const keywordMatches = matchClientsToArticle(sanitizedTitle, sanitizedDescription, clients);
  
  if (!sanitizedTitle || sanitizedTitle.length < 10) {
    return getFallbackAnalysis('Título insuficiente', keywordMatches);
  }

  // Build client list for AI prompt
  const clientListForPrompt = clients.slice(0, 50).map(c => 
    `- ${c.name}: ${(c.keywords || []).slice(0, 5).join(', ')}`
  ).join('\n');

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `Eres un asistente especializado en análisis de noticias de Puerto Rico. Tu tarea es analizar titulares y contenido de noticias para:
1. Categorizar la noticia
2. Determinar el sentimiento (positivo, negativo, neutral, mixto)
3. Identificar clientes relevantes basándote en la lista proporcionada
4. Extraer palabras clave

Responde ÚNICAMENTE en formato JSON válido.`
          },
          { 
            role: 'user', 
            content: `Analiza este artículo de noticias:

TÍTULO: ${sanitizedTitle}
DESCRIPCIÓN: ${sanitizedDescription}

LISTA DE CLIENTES Y SUS PALABRAS CLAVE:
${clientListForPrompt}

Responde SOLO con un JSON válido con esta estructura exacta:
{
  "summary": "resumen breve del artículo en español (max 100 palabras)",
  "category": "una de: ACCIDENTES|AGENCIAS DE GOBIERNO|AMBIENTE|AMBIENTE & EL TIEMPO|CIENCIA & TECNOLOGÍA|COMUNIDAD|CRIMEN|DEPORTES|ECONOMÍA & NEGOCIOS|EDUCACIÓN & CULTURA|EE.UU. & INTERNACIONALES|ENTRETENIMIENTO|GOBIERNO|OTRAS|POLÍTICA|RELIGIÓN|SALUD|SEGURIDAD|TRIBUNALES",
  "clients": [{"id": "client_uuid", "name": "nombre del cliente", "relevance": "alta|media|baja"}],
  "keywords": ["5-7 palabras clave relevantes en español"],
  "sentiment": "positive|negative|neutral|mixed",
  "sentiment_score": 0.0
}

Para sentiment_score: usa un valor entre -1.0 (muy negativo) y 1.0 (muy positivo), donde 0.0 es neutral.
Para clients: solo incluye clientes de la lista proporcionada que sean REALMENTE relevantes al contenido.` 
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      return getFallbackAnalysis('Error en API', keywordMatches);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Clean up the response
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      jsonContent = content.replace(/```\n?/g, '');
    }
    
    const parsedResult = JSON.parse(jsonContent.trim());
    
    // Merge AI-detected clients with keyword matches
    const allClients = mergeClientMatches(parsedResult.clients || [], keywordMatches);
    
    return {
      summary: parsedResult.summary || '',
      category: normalizeCategory(parsedResult.category || 'OTRAS'),
      clients: allClients,
      keywords: parsedResult.keywords || [],
      sentiment: parsedResult.sentiment || 'neutral',
      sentiment_score: typeof parsedResult.sentiment_score === 'number' ? parsedResult.sentiment_score : 0
    };
  } catch (error) {
    console.error('Analysis error:', error);
    return getFallbackAnalysis('Error de análisis', keywordMatches);
  }
}

function mergeClientMatches(
  aiClients: Array<{ id: string; name: string; relevance: string }>,
  keywordMatches: Array<{ id: string; name: string; matchedKeywords: string[] }>
): Array<{ id: string; name: string; relevance: string }> {
  const clientMap = new Map<string, { id: string; name: string; relevance: string }>();
  
  for (const match of keywordMatches) {
    const relevance = match.matchedKeywords.length >= 3 ? 'alta' : 
                     match.matchedKeywords.length >= 2 ? 'media' : 'baja';
    clientMap.set(match.id, { id: match.id, name: match.name, relevance });
  }
  
  for (const client of aiClients) {
    if (client.id && client.name) {
      clientMap.set(client.id, client);
    }
  }
  
  return Array.from(clientMap.values());
}

const VALID_CATEGORIES = [
  'ACCIDENTES', 'AGENCIAS DE GOBIERNO', 'AMBIENTE', 'AMBIENTE & EL TIEMPO',
  'CIENCIA & TECNOLOGÍA', 'COMUNIDAD', 'CRIMEN', 'DEPORTES',
  'ECONOMÍA & NEGOCIOS', 'EDUCACIÓN & CULTURA', 'EE.UU. & INTERNACIONALES',
  'ENTRETENIMIENTO', 'GOBIERNO', 'OTRAS', 'POLÍTICA', 'RELIGIÓN', 'SALUD', 
  'SEGURIDAD', 'TRIBUNALES'
];

function normalizeCategory(category: string): string {
  if (VALID_CATEGORIES.includes(category)) return category;
  
  const categoryMap: Record<string, string> = {
    'INTERNACIONAL': 'EE.UU. & INTERNACIONALES',
    'INTERNACIONALES': 'EE.UU. & INTERNACIONALES',
    'NEGOCIOS': 'ECONOMÍA & NEGOCIOS',
    'ECONOMÍA': 'ECONOMÍA & NEGOCIOS',
    'CULTURA': 'EDUCACIÓN & CULTURA',
    'EDUCACIÓN': 'EDUCACIÓN & CULTURA',
    'TIEMPO': 'AMBIENTE & EL TIEMPO',
    'TECNOLOGÍA': 'CIENCIA & TECNOLOGÍA',
    'CIENCIA': 'CIENCIA & TECNOLOGÍA',
    'JUSTICIA': 'TRIBUNALES',
  };
  
  return categoryMap[category] || 'OTRAS';
}

function getFallbackAnalysis(
  reason: string, 
  keywordMatches: Array<{ id: string; name: string; matchedKeywords: string[] }> = []
): AnalysisResult {
  const clients = keywordMatches.map(m => ({
    id: m.id,
    name: m.name,
    relevance: m.matchedKeywords.length >= 3 ? 'alta' : 
               m.matchedKeywords.length >= 2 ? 'media' : 'baja'
  }));
  
  return {
    summary: reason,
    category: 'OTRAS',
    clients,
    keywords: [],
    sentiment: 'neutral',
    sentiment_score: 0
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseKey || !lovableApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body
    const { limit = 10 } = await req.json().catch(() => ({}));
    
    // Fetch clients for matching
    const clients = await fetchClients(supabase);
    console.log(`Loaded ${clients.length} clients for matching`);

    // Get articles without sentiment analysis
    const { data: articles, error: fetchError } = await supabase
      .from('news_articles')
      .select('id, title, description')
      .is('sentiment', null)
      .order('pub_date', { ascending: false })
      .limit(limit);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${articles?.length || 0} articles to reprocess`);

    const results = [];
    for (const article of articles || []) {
      try {
        console.log(`Analyzing: ${article.title?.substring(0, 50)}...`);
        
        const analysis = await analyzeArticle(
          article.title,
          article.description || '',
          lovableApiKey,
          clients
        );

        // Update the article
        const { error: updateError } = await supabase
          .from('news_articles')
          .update({
            sentiment: analysis.sentiment,
            sentiment_score: analysis.sentiment_score,
            clients: analysis.clients,
            category: analysis.category,
            summary: analysis.summary,
            keywords: analysis.keywords,
            last_processed: new Date().toISOString()
          })
          .eq('id', article.id);

        if (updateError) {
          console.error(`Error updating article ${article.id}:`, updateError);
          results.push({ id: article.id, success: false, error: updateError.message });
        } else {
          results.push({ 
            id: article.id, 
            success: true, 
            sentiment: analysis.sentiment,
            clientsMatched: analysis.clients.length
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing article ${article.id}:`, error);
        results.push({ 
          id: article.id, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reanalyze-articles:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error reprocessing articles',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
