import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const RSS_FEEDS = [
  { url: "https://rss.app/feeds/v1.1/Zk2ySs2LemEIrBaR.json", name: "El Nuevo Día" },
  { url: "https://rss.app/feeds/v1.1/lzpdZAZO66AyiC3I.json", name: "Primera Hora" },
  { url: "https://rss.app/feeds/v1.1/JyTkN9iWY5xFVmwa.json", name: "Metro PR" },
  { url: "https://rss.app/feeds/v1.1/gW8MsZ8sYypQRq1A.json", name: "El Vocero" }
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

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

const BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const MAX_TEXT_LENGTH = 2000;
const MIN_TEXT_LENGTH = 50;

async function logProcessingError(supabase: any, error: ProcessingError) {
  try {
    const { error: dbError } = await supabase
      .from('processing_errors')
      .insert([{
        stage: error.stage,
        error_message: error.error,
        article_info: error.article,
        raw_content: error.rawContent,
        created_at: new Date().toISOString()
      }]);

    if (dbError) {
      console.error('Error logging processing error:', dbError);
    }
  } catch (e) {
    console.error('Failed to log processing error:', e);
  }
}

function sanitizeText(text: string, debug = false): { text: string; issues: string[] } {
  if (!text) return { text: '', issues: ['Empty text'] };
  
  const issues: string[] = [];
  let sanitized = text;

  // Track transformations
  if (debug) {
    const originalLength = text.length;
    
    if (/[`'"]/g.test(text)) {
      issues.push('Contains problematic quotes');
    }
    
    if (/[\u0000-\u001F\u007F-\u009F]/g.test(text)) {
      issues.push('Contains control characters');
    }
    
    if (/&[a-zA-Z0-9]+;/g.test(text)) {
      issues.push('Contains HTML entities');
    }
  }

  // Enhanced sanitization
  sanitized = text
    .replace(/[`'"]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/&[a-zA-Z0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.length > MAX_TEXT_LENGTH) {
    issues.push(`Text truncated from ${sanitized.length} to ${MAX_TEXT_LENGTH} characters`);
    sanitized = sanitized.substring(0, MAX_TEXT_LENGTH);
  }

  return { text: sanitized, issues };
}

async function analyzeArticle(title: string, description: string, openAIApiKey: string, clients: any[], supabase: any) {
  const { text: sanitizedTitle, issues: titleIssues } = sanitizeText(title, true);
  const { text: sanitizedDescription, issues: descriptionIssues } = sanitizeText(description, true);
  
  // Detailed logging of content analysis
  console.log('Article analysis started:', {
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

  // Content validation with detailed error tracking
  if (!sanitizedTitle || sanitizedTitle.length < MIN_TEXT_LENGTH) {
    const error = {
      stage: 'preprocessing' as const,
      error: 'Title too short or invalid',
      article: { title, description, source: 'N/A' },
      rawContent: title
    };
    await logProcessingError(supabase, error);
    return getFallbackAnalysis('Título insuficiente para análisis');
  }

  if (!sanitizedDescription || sanitizedDescription.length < MIN_TEXT_LENGTH) {
    const error = {
      stage: 'preprocessing' as const,
      error: 'Description too short or invalid',
      article: { title, description, source: 'N/A' },
      rawContent: description
    };
    await logProcessingError(supabase, error);
    return getFallbackAnalysis('Descripción insuficiente para análisis');
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`Analysis attempt ${attempt + 1} for: "${sanitizedTitle.substring(0, 50)}..."`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'Eres un asistente especializado en análisis de noticias. Respondes ÚNICAMENTE en formato JSON válido.'
            },
            { 
              role: 'user', 
              content: `Analiza este artículo y proporciona un análisis estructurado.
                Título: ${sanitizedTitle}
                Descripción: ${sanitizedDescription}
                
                Responde SOLO con un JSON válido que siga esta estructura:
                {
                  "summary": "string",
                  "category": "string (una de las categorías permitidas)",
                  "clients": ["array de strings"],
                  "keywords": ["array de 5-7 palabras clave"]
                }` 
            }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`OpenAI API error (attempt ${attempt + 1}):`, errorData);
        
        if (attempt === MAX_RETRIES - 1) {
          await logProcessingError(supabase, {
            stage: 'analysis',
            error: `OpenAI API error: ${JSON.stringify(errorData)}`,
            article: { title, description, source: 'N/A' }
          });
          return getFallbackAnalysis('Error en el servicio de análisis');
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const parsedResult = JSON.parse(content);
        
        if (!isValidResult(parsedResult)) {
          throw new Error('Invalid result structure');
        }
        
        return parsedResult;
      } catch (parseError) {
        console.error(`JSON parsing error (attempt ${attempt + 1}):`, {
          error: parseError,
          content
        });
        
        if (attempt === MAX_RETRIES - 1) {
          await logProcessingError(supabase, {
            stage: 'parsing',
            error: `JSON parsing error: ${parseError.message}`,
            article: { title, description, source: 'N/A' },
            rawContent: content
          });
          return getFallbackAnalysis('Error en el formato de análisis');
        }
      }
    } catch (error) {
      console.error(`Analysis attempt ${attempt + 1} failed:`, error);
      
      if (attempt === MAX_RETRIES - 1) {
        await logProcessingError(supabase, {
          stage: 'analysis',
          error: error.message,
          article: { title, description, source: 'N/A' }
        });
        return getFallbackAnalysis('Error en el proceso de análisis');
      }
    }
  }

  return getFallbackAnalysis('Error después de múltiples intentos');
}

function isValidResult(result: any): boolean {
  return (
    result &&
    typeof result.summary === 'string' &&
    typeof result.category === 'string' &&
    Array.isArray(result.clients) &&
    Array.isArray(result.keywords) &&
    result.keywords.length >= 1 &&
    result.keywords.length <= 7 &&
    isValidCategory(result.category)
  );
}

function getFallbackAnalysis(reason: string) {
  return {
    summary: reason,
    category: 'OTRAS',
    clients: [],
    keywords: []
  };
}

function isValidCategory(category: string): boolean {
  const validCategories = [
    'ACCIDENTES', 'AGENCIAS DE GOBIERNO', 'AMBIENTE', 'AMBIENTE & EL TIEMPO',
    'CIENCIA & TECNOLOGÍA', 'COMUNIDAD', 'CRIMEN', 'DEPORTES',
    'ECONOMÍA & NEGOCIOS', 'EDUCACIÓN & CULTURA', 'EE.UU. & INTERNACIONALES',
    'ENTRETENIMIENTO', 'GOBIERNO', 'OTRAS', 'POLÍTICA', 'RELIGIÓN', 'SALUD', 'TRIBUNALES'
  ];
  return validCategories.includes(category);
}

function parseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
    return new Date().toISOString();
  }
}

function extractImageUrl(item: any): string | null {
  return item.image || 
         item.banner_image || 
         item.enclosure?.url ||
         (item.media_content && item.media_content[0]?.url) ||
         null;
}

async function getClientKeywords(supabase: any) {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('name, keywords')
      .not('keywords', 'is', null);

    if (error) throw error;
    return clients;
  } catch (error) {
    console.error('Error fetching client keywords:', error);
    return [];
  }
}

async function processArticleBatch(articles: any[], openAIApiKey: string, clients: any[], supabase: any) {
  const results = [];
  
  for (const article of articles) {
    try {
      console.log(`Processing article: ${article.title}`);
      
      const analysis = await analyzeArticle(
        article.title,
        article.description || '',
        openAIApiKey,
        clients,
        supabase
      );
      
      results.push({
        title: article.title,
        description: article.description || '',
        link: article.url || article.link,
        pub_date: parseDate(article.date_published || article.pubDate || article.published),
        source: article.source,
        summary: analysis.summary,
        category: analysis.category,
        clients: analysis.clients,
        keywords: analysis.keywords,
        image_url: extractImageUrl(article),
        last_processed: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error processing article: ${article.title}`, error);
    }
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create processing_errors table if it doesn't exist
    await supabase.rpc('create_processing_errors_if_not_exists');

    const clients = await getClientKeywords(supabase);
    console.log(`Fetched ${clients.length} clients with keywords`);

    const processedArticles = [];
    for (const feed of RSS_FEEDS) {
      try {
        console.log(`Fetching feed from: ${feed.name}`);
        const response = await fetch(feed.url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Received data from ${feed.name}:`, JSON.stringify(data).slice(0, 200) + '...');
        
        if (!data.items || !Array.isArray(data.items)) {
          console.error(`Invalid or empty feed data from: ${feed.name}`);
          continue;
        }

        console.log(`Found ${data.items.length} articles in ${feed.name}`);

        for (let i = 0; i < data.items.length; i += BATCH_SIZE) {
          const batch = data.items.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(data.items.length / BATCH_SIZE)} for ${feed.name}`);
          
          const batchResults = await processArticleBatch(
            batch.map((item: any) => ({ ...item, source: feed.name })),
            openAIApiKey,
            clients,
            supabase
          );
          processedArticles.push(...batchResults);
        }
      } catch (error) {
        console.error(`Error processing feed ${feed.name}:`, error);
      }
    }

    console.log(`Total articles processed: ${processedArticles.length}`);

    if (processedArticles.length > 0) {
      console.log('Upserting articles to database...');
      const { error } = await supabase
        .from('news_articles')
        .upsert(processedArticles, {
          onConflict: 'link',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      console.log('Successfully upserted articles');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        articlesProcessed: processedArticles.length 
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error processing RSS feeds:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al procesar los feeds RSS',
        details: error.message 
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
