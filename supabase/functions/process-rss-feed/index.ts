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
    // First try parsing as ISO string
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // If that fails, try parsing various RSS date formats
    const formats = [
      // RFC 822
      /^\w{3}, \d{1,2} \w{3} \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}$/,
      // RFC 850
      /^\w{6,9}, \d{2}-\w{3}-\d{2} \d{2}:\d{2}:\d{2} GMT$/,
      // ANSI C
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

    // Last resort: try parsing with Date.parse
    const timestamp = Date.parse(dateStr);
    if (!isNaN(timestamp)) {
      return new Date(timestamp);
    }

    throw new Error(`Unable to parse date: ${dateStr}`);
  } catch (error) {
    console.error(`Error parsing date ${dateStr}:`, error);
    return new Date(); // Fallback to current date if parsing fails
  }
}

async function processArticle(
  article: Article,
  feedSourceId: string,
  supabase: any,
  openAIApiKey: string
) {
  try {
    // Check for duplicate articles
    const { data: existingArticle } = await supabase
      .from('news_articles')
      .select('id')
      .eq('link', article.link)
      .maybeSingle();

    if (existingArticle) {
      console.log('Article already exists:', article.title);
      return null;
    }

    // Parse and validate the publication date
    const pubDate = parsePublicationDate(article.pub_date);
    console.log(`Parsed date for "${article.title}":`, pubDate.toISOString());

    // Don't process articles older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (pubDate < sevenDaysAgo) {
      console.log(`Skipping old article "${article.title}" from ${pubDate.toLocaleDateString()}`);
      return null;
    }

    // Analyze article content
    const analysis = await analyzeArticle(
      article.title,
      article.description,
      openAIApiKey,
      article.source,
      supabase
    );

    // Insert the new article
    const { data: newArticle, error: insertError } = await supabase
      .from('news_articles')
      .insert([{
        title: article.title,
        description: article.description,
        link: article.link,
        pub_date: pubDate.toISOString(), // Use the parsed date
        source: article.source,
        image_url: article.image_url,
        category: analysis.category,
        summary: analysis.summary,
        keywords: analysis.keywords,
        clients: analysis.clients,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logProcessingError(supabase, {
      stage: 'preprocessing',
      error: errorMessage,
      article: {
        title: article.title,
        description: article.description,
        source: article.source
      }
    });
    return null;
  }
}

async function processFeedSource(feedSource: FeedSource, supabase: any, openAIApiKey: string) {
  console.log(`Processing feed source: ${feedSource.name}`);
  
  try {
    const response = await fetch(feedSource.url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const feedData = await response.json();
    console.log(`Processing ${feedData.items?.length || 0} items from ${feedSource.name}`);

    // Validate feed structure
    if (!feedData || !Array.isArray(feedData.items)) {
      throw new Error(`Invalid feed format for ${feedSource.name}: items array not found or not an array`);
    }

    let successCount = 0;
    let errorCount = 0;

    // Sort items by publication date (newest first)
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

      const result = await processArticle(article, feedSource.id, supabase, openAIApiKey);
      if (result) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    // Update feed source status
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
    
    // Update feed source error status
    const currentErrorCount = (feedSource.error_count || 0) + 1;
    const errorMessage = error instanceof Error ? error.message : String(error);
    await supabase
      .from('feed_sources')
      .update({
        last_fetch_error: errorMessage,
        error_count: currentErrorCount
      })
      .eq('id', feedSource.id);

    const errorMessage = error instanceof Error ? error.message : String(error);
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
      const result = await processFeedSource(feedSource, supabase, openAIApiKey);
      results.push({
        source: feedSource.name,
        ...result
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
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
    console.error('Error processing RSS feeds:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
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

const RSS_FEEDS = [
  { url: "https://rss.app/feeds/v1.1/Zk2ySs2LemEIrBaR.json", name: "El Nuevo Día" },
  { url: "https://rss.app/feeds/v1.1/lzpdZAZO66AyiC3I.json", name: "Primera Hora" },
  { url: "https://rss.app/feeds/v1.1/JyTkN9iWY5xFVmwa.json", name: "Metro PR" },
  { url: "https://rss.app/feeds/v1.1/gW8MsZ8sYypQRq1A.json", name: "El Vocero" }
];

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

  // Track sanitization issues
  if (/[`'"]/g.test(text)) {
    issues.push('Contains problematic quotes');
  }
  if (/[\u0000-\u001F\u007F-\u009F]/g.test(text)) {
    issues.push('Contains control characters');
  }
  if (/&[a-zA-Z0-9]+;/g.test(text)) {
    issues.push('Contains HTML entities');
  }

  // Sanitization process
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
  openAIApiKey: string, 
  source: string,
  supabase: any
) {
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

  // Content validation
  if (!sanitizedTitle || sanitizedTitle.length < 50) {
    await logProcessingError(supabase, {
      stage: 'preprocessing',
      error: 'Title too short or invalid',
      article: { title, description, source },
      rawContent: title
    });
    return getFallbackAnalysis('Título insuficiente para análisis');
  }

  if (!sanitizedDescription || sanitizedDescription.length < 100) {
    await logProcessingError(supabase, {
      stage: 'preprocessing',
      error: 'Description too short or invalid',
      article: { title, description, source },
      rawContent: description
    });
    return getFallbackAnalysis('Descripción insuficiente para análisis');
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`Analysis attempt ${attempt + 1} for article from ${source}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
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
                  "category": "ACCIDENTES|AGENCIAS DE GOBIERNO|AMBIENTE|AMBIENTE & EL TIEMPO|CIENCIA & TECNOLOGÍA|COMUNIDAD|CRIMEN|DEPORTES|ECONOMÍA & NEGOCIOS|EDUCACIÓN & CULTURA|EE.UU. & INTERNACIONALES|ENTRETENIMIENTO|GOBIERNO|OTRAS|POLÍTICA|RELIGIÓN|SALUD|TRIBUNALES",
                  "clients": [],
                  "keywords": ["5-7 palabras clave relevantes"]
                }` 
            }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`OpenAI API error (attempt ${attempt + 1}):`, errorData);
        
        if (attempt === 2) {
          await logProcessingError(supabase, {
            stage: 'analysis',
            error: `OpenAI API error: ${JSON.stringify(errorData)}`,
            article: { title, description, source }
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
        
        if (!isValidAnalysisResult(parsedResult)) {
          throw new Error('Invalid result structure');
        }
        
        return parsedResult;
      } catch (parseError) {
        console.error(`JSON parsing error (attempt ${attempt + 1}):`, {
          error: parseError,
          content
        });
        
        if (attempt === 2) {
          const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          await logProcessingError(supabase, {
            stage: 'parsing',
            error: `JSON parsing error: ${parseErrorMessage}`,
            article: { title, description, source },
            rawContent: content
          });
          return getFallbackAnalysis('Error en el formato de análisis');
        }
      }
    } catch (error) {
      console.error(`Analysis attempt ${attempt + 1} failed:`, error);
      
      if (attempt === 2) {
        await logProcessingError(supabase, {
          stage: 'analysis',
          error: error.message,
          article: { title, description, source }
        });
        return getFallbackAnalysis('Error en el proceso de análisis');
      }
    }
  }

  return getFallbackAnalysis('Error después de múltiples intentos');
}

function isValidAnalysisResult(result: any): boolean {
  const validCategories = [
    'ACCIDENTES', 'AGENCIAS DE GOBIERNO', 'AMBIENTE', 'AMBIENTE & EL TIEMPO',
    'CIENCIA & TECNOLOGÍA', 'COMUNIDAD', 'CRIMEN', 'DEPORTES',
    'ECONOMÍA & NEGOCIOS', 'EDUCACIÓN & CULTURA', 'EE.UU. & INTERNACIONALES',
    'ENTRETENIMIENTO', 'GOBIERNO', 'OTRAS', 'POLÍTICA', 'RELIGIÓN', 'SALUD', 'TRIBUNALES'
  ];

  return (
    result &&
    typeof result.summary === 'string' &&
    typeof result.category === 'string' &&
    validCategories.includes(result.category) &&
    Array.isArray(result.clients) &&
    Array.isArray(result.keywords) &&
    result.keywords.length >= 1 &&
    result.keywords.length <= 7
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
