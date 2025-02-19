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

const BATCH_SIZE = 5;
const MAX_RETRIES = 3;
const MAX_TEXT_LENGTH = 2000; // Increased from 1000 to handle longer articles
const MIN_TEXT_LENGTH = 50;   // Minimum length for meaningful analysis

function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Enhanced text sanitization
  return text
    .replace(/[`'"]/g, '') // Remove problematic quotes
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/&[a-zA-Z0-9]+;/g, ' ') // Convert HTML entities to spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, MAX_TEXT_LENGTH);
}

async function analyzeArticle(title: string, description: string, openAIApiKey: string, clients: any[]) {
  const sanitizedTitle = sanitizeText(title);
  const sanitizedDescription = sanitizeText(description);
  
  // Log article details for debugging
  console.log(`Processing article: "${sanitizedTitle.substring(0, 100)}..."`);
  console.log(`Content lengths - Title: ${sanitizedTitle.length}, Description: ${sanitizedDescription.length}`);

  // Content validation
  if (!sanitizedTitle || sanitizedTitle.length < MIN_TEXT_LENGTH) {
    console.warn('Article title too short or invalid');
    return getFallbackAnalysis('Título insuficiente para análisis');
  }

  if (!sanitizedDescription || sanitizedDescription.length < MIN_TEXT_LENGTH) {
    console.warn('Article description too short or invalid');
    return getFallbackAnalysis('Descripción insuficiente para análisis');
  }

  const prompt = `
    Analiza este artículo de noticias y proporciona un análisis estructurado.
    
    ARTÍCULO:
    Título: ${sanitizedTitle}
    Descripción: ${sanitizedDescription}

    INSTRUCCIONES:
    Proporciona un análisis en formato JSON que siga EXACTAMENTE esta estructura:
    {
      "summary": "Resumen conciso de 2-3 oraciones que capture los puntos principales",
      "category": "ACCIDENTES|AGENCIAS DE GOBIERNO|AMBIENTE|AMBIENTE & EL TIEMPO|CIENCIA & TECNOLOGÍA|COMUNIDAD|CRIMEN|DEPORTES|ECONOMÍA & NEGOCIOS|EDUCACIÓN & CULTURA|EE.UU. & INTERNACIONALES|ENTRETENIMIENTO|GOBIERNO|OTRAS|POLÍTICA|RELIGIÓN|SALUD|TRIBUNALES",
      "clients": ["Solo nombres de clientes mencionados"],
      "keywords": ["5-7 palabras clave relevantes"]
    }

    REGLAS:
    1. Usa SOLO las categorías listadas arriba
    2. Genera JSON válido con comillas dobles
    3. Si no hay suficiente contexto, usa "OTRAS" como categoría
    4. El resumen debe ser conciso pero informativo
    5. Las palabras clave deben ser específicas al contenido
  `;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} for article analysis`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using the faster model for better performance
          messages: [
            { 
              role: 'system', 
              content: 'Eres un asistente especializado en análisis de noticias. Respondes ÚNICAMENTE en formato JSON válido.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3, // Lower temperature for more consistent output
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`OpenAI API error (attempt ${attempt + 1}):`, errorData);
        
        if (attempt === MAX_RETRIES - 1) {
          return getFallbackAnalysis('Error en el servicio de análisis');
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const parsedResult = JSON.parse(content);
        
        // Validate required fields
        if (!parsedResult.summary || !parsedResult.category || 
            !Array.isArray(parsedResult.clients) || !Array.isArray(parsedResult.keywords)) {
          throw new Error('Invalid JSON structure');
        }
        
        // Validate category
        if (!isValidCategory(parsedResult.category)) {
          parsedResult.category = 'OTRAS';
        }
        
        return parsedResult;
      } catch (parseError) {
        console.error(`JSON parsing error (attempt ${attempt + 1}):`, parseError);
        console.error('Failed content:', content);
        
        if (attempt === MAX_RETRIES - 1) {
          return getFallbackAnalysis('Error en el formato de análisis');
        }
      }
    } catch (error) {
      console.error(`Analysis attempt ${attempt + 1} failed:`, error);
      if (attempt === MAX_RETRIES - 1) {
        return getFallbackAnalysis('Error en el proceso de análisis');
      }
    }
  }

  return getFallbackAnalysis('Error después de múltiples intentos');
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

async function processArticleBatch(articles: any[], openAIApiKey: string, clients: any[]) {
  const results = [];
  
  for (const article of articles) {
    try {
      console.log(`Processing article: ${article.title}`);
      
      const analysis = await analyzeArticle(
        article.title,
        article.description || '',
        openAIApiKey,
        clients
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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting RSS feed processing...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
            clients
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
