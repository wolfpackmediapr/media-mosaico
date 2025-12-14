import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedSource {
  id: string;
  name: string;
  url: string;
  last_successful_fetch: string | null;
  error_count: number;
}

interface Article {
  title: string;
  description: string;
  link: string;
  pub_date: string;
  source: string;
  image_url?: string;
}

interface FeedItem {
  title: string;
  link?: string;
  url?: string;
  description?: string;
  content?: string;
  content_text?: string;
  content_html?: string;
  published?: string;
  created?: number;
  date_published?: string;
  image?: string;
  media?: {
    thumbnail?: { url: string };
    content?: { url: string };
  };
  attachments?: Array<{ url: string }>;
}

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

function getArticleLink(item: FeedItem): string {
  return item.link || item.url || '';
}

function getArticleContent(item: FeedItem): string {
  return item.description || 
         item.content || 
         item.content_text ||
         (item.content_html ? stripHtml(item.content_html) : '') || 
         '';
}

function getArticleDate(item: FeedItem): string {
  return item.date_published || 
         item.published || 
         (item.created ? new Date(item.created).toISOString() : '') ||
         new Date().toISOString();
}

function getArticleImage(item: FeedItem): string | undefined {
  return item.image ||
         item.media?.content?.url ||
         item.media?.thumbnail?.url ||
         item.attachments?.[0]?.url;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parsePublicationDate(dateStr: string): Date {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    const formats = [
      /^\w{3}, \d{1,2} \w{3} \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}$/,
      /^\w{6,9}, \d{2}-\w{3}-\d{2} \d{2}:\d{2}:\d{2} GMT$/,
      /^\w{3} \w{3} \d{1,2} \d{2}:\d{2}:\d{2} \d{4}$/
    ];

    for (const format of formats) {
      if (format.test(dateStr)) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    const timestamp = Date.parse(dateStr);
    if (!isNaN(timestamp)) {
      return new Date(timestamp);
    }

    throw new Error(`Unable to parse date: ${dateStr}`);
  } catch (error) {
    console.error(`Error parsing date ${dateStr}:`, error);
    return new Date();
  }
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

async function processArticle(
  article: Article,
  feedSourceId: string,
  supabase: any,
  lovableApiKey: string,
  clients: Client[]
) {
  try {
    const { data: existingArticle } = await supabase
      .from('news_articles')
      .select('id')
      .eq('link', article.link)
      .maybeSingle();

    if (existingArticle) {
      console.log('Article already exists:', article.title);
      return null;
    }

    const pubDate = parsePublicationDate(article.pub_date);
    console.log(`Parsed date for "${article.title}":`, pubDate.toISOString());

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (pubDate < sevenDaysAgo) {
      console.log(`Skipping old article "${article.title}" from ${pubDate.toLocaleDateString()}`);
      return null;
    }

    // Analyze article with AI including sentiment and client matching
    const analysis = await analyzeArticle(
      article.title,
      article.description,
      lovableApiKey,
      article.source,
      supabase,
      clients
    );

    // Insert the new article with sentiment data
    const { data: newArticle, error: insertError } = await supabase
      .from('news_articles')
      .insert([{
        title: article.title,
        description: article.description,
        link: article.link,
        pub_date: pubDate.toISOString(),
        source: article.source,
        image_url: article.image_url,
        category: analysis.category,
        summary: analysis.summary,
        keywords: analysis.keywords,
        clients: analysis.clients,
        sentiment: analysis.sentiment,
        sentiment_score: analysis.sentiment_score,
        feed_source_id: feedSourceId,
        last_processed: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return newArticle;
  } catch (error) {
    console.error('Error processing article:', error);
    await logProcessingError(supabase, {
      stage: 'preprocessing',
      error: error instanceof Error ? error.message : String(error),
      article: {
        title: article.title,
        description: article.description,
        source: article.source
      }
    });
    return null;
  }
}

async function processFeedSource(
  feedSource: FeedSource, 
  supabase: any, 
  lovableApiKey: string,
  clients: Client[]
) {
  console.log(`Processing feed source: ${feedSource.name}`);
  
  try {
    const response = await fetch(feedSource.url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const feedData = await response.json();
    console.log(`Processing ${feedData.items?.length || 0} items from ${feedSource.name}`);

    if (!feedData || !Array.isArray(feedData.items)) {
      throw new Error(`Invalid feed format for ${feedSource.name}: items array not found or not an array`);
    }

    let successCount = 0;
    let errorCount = 0;

    const sortedItems = feedData.items.sort((a: any, b: any) => {
      const dateA = new Date(getArticleDate(a));
      const dateB = new Date(getArticleDate(b));
      return dateB.getTime() - dateA.getTime();
    });

    for (const item of sortedItems) {
      const link = getArticleLink(item);
      if (!item.title || !link) {
        console.warn(`Skipping invalid item in ${feedSource.name}:`, JSON.stringify(item, null, 2));
        continue;
      }

      const article: Article = {
        title: item.title,
        description: getArticleContent(item),
        link: link,
        pub_date: getArticleDate(item),
        source: feedSource.name,
        image_url: getArticleImage(item)
      };

      const result = await processArticle(article, feedSource.id, supabase, lovableApiKey, clients);
      if (result) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    await supabase
      .from('feed_sources')
      .update({
        last_successful_fetch: new Date().toISOString(),
        last_fetch_error: null,
        error_count: 0
      })
      .eq('id', feedSource.id);

    return { successCount, errorCount };
  } catch (error) {
    console.error(`Error processing feed ${feedSource.name}:`, error);
    
    const currentErrorCount = (feedSource.error_count || 0) + 1;
    const errorMessage = error instanceof Error ? error.message : String(error);
    await supabase
      .from('feed_sources')
      .update({
        last_fetch_error: errorMessage,
        error_count: currentErrorCount
      })
      .eq('id', feedSource.id);

    return { successCount: 0, errorCount: 1, error: errorMessage };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    if (!lovableApiKey) {
      throw new Error('Missing LOVABLE_API_KEY environment variable');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch clients once for all articles
    const clients = await fetchClients(supabase);
    console.log(`Loaded ${clients.length} clients with keywords for matching`);

    // Get active feed sources
    const { data: feedSources, error: feedSourcesError } = await supabase
      .from('feed_sources')
      .select('*')
      .eq('active', true);

    if (feedSourcesError) {
      throw feedSourcesError;
    }

    const results = [];
    for (const feedSource of feedSources) {
      const result = await processFeedSource(feedSource, supabase, lovableApiKey, clients);
      results.push({
        source: feedSource.name,
        ...result
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        clientsLoaded: clients.length,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error processing RSS feeds:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al procesar los feeds RSS',
        details: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

interface ProcessingError {
  stage: 'extraction' | 'preprocessing' | 'analysis' | 'parsing';
  error: string;
  article?: {
    title: string;
    description: string;
    source: string;
  };
  rawContent?: string;
}

async function logProcessingError(supabase: any, error: ProcessingError) {
  try {
    const { error: dbError } = await supabase
      .from('processing_errors')
      .insert([{
        stage: error.stage,
        error_message: error.error,
        article_info: error.article,
        raw_content: error.rawContent,
      }]);

    if (dbError) {
      console.error('Error logging processing error:', dbError);
    }
  } catch (e) {
    console.error('Failed to log processing error:', e);
  }
}

function sanitizeText(text: string): { text: string; issues: string[] } {
  if (!text) return { text: '', issues: ['Empty text'] };
  
  const issues: string[] = [];
  let sanitized = text;

  if (/[`'"]/g.test(text)) {
    issues.push('Contains problematic quotes');
  }
  if (/[\u0000-\u001F\u007F-\u009F]/g.test(text)) {
    issues.push('Contains control characters');
  }
  if (/&[a-zA-Z0-9]+;/g.test(text)) {
    issues.push('Contains HTML entities');
  }

  sanitized = text
    .replace(/[`'"]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/&[a-zA-Z0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.length > 2000) {
    issues.push(`Text truncated from ${sanitized.length} to 2000 characters`);
    sanitized = sanitized.substring(0, 2000);
  }

  return { text: sanitized, issues };
}

async function analyzeArticle(
  title: string, 
  description: string, 
  lovableApiKey: string, 
  source: string,
  supabase: any,
  clients: Client[]
): Promise<AnalysisResult> {
  const { text: sanitizedTitle, issues: titleIssues } = sanitizeText(title);
  const { text: sanitizedDescription, issues: descriptionIssues } = sanitizeText(description);
  
  console.log('Processing article:', {
    source,
    title: {
      original: title?.length,
      sanitized: sanitizedTitle.length,
      issues: titleIssues
    },
    description: {
      original: description?.length,
      sanitized: sanitizedDescription.length,
      issues: descriptionIssues
    }
  });

  // Pre-match clients based on keywords
  const keywordMatches = matchClientsToArticle(sanitizedTitle, sanitizedDescription, clients);
  console.log(`Found ${keywordMatches.length} keyword matches for article`);

  // Content validation
  if (!sanitizedTitle || sanitizedTitle.length < 10) {
    await logProcessingError(supabase, {
      stage: 'preprocessing',
      error: 'Title too short or invalid',
      article: { title, description, source },
      rawContent: title
    });
    return getFallbackAnalysis('Título insuficiente para análisis', keywordMatches);
  }

  // Build client list for AI prompt
  const clientListForPrompt = clients.slice(0, 50).map(c => 
    `- ${c.name}: ${(c.keywords || []).slice(0, 5).join(', ')}`
  ).join('\n');

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`Analysis attempt ${attempt + 1} for article from ${source}`);
      
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
FUENTE: ${source}

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
        const errorData = await response.text();
        console.error(`Lovable AI API error (attempt ${attempt + 1}):`, errorData);
        
        if (response.status === 429) {
          console.log('Rate limited, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 2000));
          continue;
        }
        
        if (attempt === 2) {
          await logProcessingError(supabase, {
            stage: 'analysis',
            error: `Lovable AI API error: ${errorData}`,
            article: { title, description, source }
          });
          return getFallbackAnalysis('Error en el servicio de análisis', keywordMatches);
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        // Clean up the response if it has markdown code blocks
        let jsonContent = content;
        if (content.includes('```json')) {
          jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (content.includes('```')) {
          jsonContent = content.replace(/```\n?/g, '');
        }
        
        const parsedResult = JSON.parse(jsonContent.trim());
        
        if (!isValidAnalysisResult(parsedResult)) {
          throw new Error('Invalid result structure');
        }
        
        // Merge AI-detected clients with keyword matches
        const allClients = mergeClientMatches(parsedResult.clients, keywordMatches);
        
        return {
          ...parsedResult,
          clients: allClients,
          category: normalizeCategory(parsedResult.category),
          sentiment: parsedResult.sentiment || 'neutral',
          sentiment_score: typeof parsedResult.sentiment_score === 'number' ? parsedResult.sentiment_score : 0
        };
      } catch (parseError) {
        console.error(`JSON parsing error (attempt ${attempt + 1}):`, {
          error: parseError,
          content
        });
        
        if (attempt === 2) {
          await logProcessingError(supabase, {
            stage: 'parsing',
            error: `JSON parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            article: { title, description, source },
            rawContent: content
          });
          return getFallbackAnalysis('Error en el formato de análisis', keywordMatches);
        }
      }
    } catch (error) {
      console.error(`Analysis attempt ${attempt + 1} failed:`, error);
      
      if (attempt === 2) {
        await logProcessingError(supabase, {
          stage: 'analysis',
          error: error instanceof Error ? error.message : String(error),
          article: { title, description, source }
        });
        return getFallbackAnalysis('Error en el proceso de análisis', keywordMatches);
      }
    }
  }

  return getFallbackAnalysis('Error después de múltiples intentos', keywordMatches);
}

// Merge AI-detected clients with keyword-matched clients
function mergeClientMatches(
  aiClients: Array<{ id: string; name: string; relevance: string }>,
  keywordMatches: Array<{ id: string; name: string; matchedKeywords: string[] }>
): Array<{ id: string; name: string; relevance: string }> {
  const clientMap = new Map<string, { id: string; name: string; relevance: string }>();
  
  // Add keyword matches first
  for (const match of keywordMatches) {
    const relevance = match.matchedKeywords.length >= 3 ? 'alta' : 
                     match.matchedKeywords.length >= 2 ? 'media' : 'baja';
    clientMap.set(match.id, { id: match.id, name: match.name, relevance });
  }
  
  // Add/update with AI matches (AI takes precedence for relevance)
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

function isValidAnalysisResult(result: any): boolean {
  if (!result || 
      typeof result.summary !== 'string' ||
      typeof result.category !== 'string' ||
      !Array.isArray(result.clients) ||
      !Array.isArray(result.keywords)) {
    return false;
  }
  
  return true;
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
