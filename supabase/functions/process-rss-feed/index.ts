
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
};

const BATCH_SIZE = 5;
const MAX_RETRIES = 3;

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

async function analyzeArticle(title: string, description: string, openAIApiKey: string, clients: any[]) {
  const clientInfo = clients.map(c => ({
    name: c.name,
    keywords: c.keywords
  }));

  const prompt = `
    Analiza este artículo de noticias en español. Considera los siguientes clientes y sus palabras clave:
    ${JSON.stringify(clientInfo, null, 2)}

    Título: ${title}
    Descripción: ${description}

    Instrucciones:
    1. Resume el contenido en 3-4 oraciones concisas.
    2. Clasifica en UNA categoría: ACCIDENTES, AGENCIAS DE GOBIERNO, AMBIENTE, AMBIENTE & EL TIEMPO, CIENCIA & TECNOLOGÍA, COMUNIDAD, CRIMEN, DEPORTES, ECONOMÍA & NEGOCIOS, EDUCACIÓN & CULTURA, EE.UU. & INTERNACIONALES, ENTRETENIMIENTO, GOBIERNO, OTRAS, POLÍTICA, RELIGIÓN, SALUD, TRIBUNALES
    3. Identifica clientes relevantes basado en el contenido y palabras clave.
    4. Extrae 5-7 palabras clave principales.

    Responde en JSON:
    {
      "summary": "string",
      "category": "string",
      "clients": ["string"],
      "keywords": ["string"]
    }
  `;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Eres un asistente especializado en análisis de noticias en español.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === MAX_RETRIES - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return {
    summary: 'Error al analizar el artículo',
    category: 'OTRAS',
    clients: [],
    keywords: []
  };
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting RSS feed processing...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
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
        
        if (!data.items) {
          console.error(`No items found in feed: ${feed.name}`);
          continue;
        }

        for (let i = 0; i < data.items.length; i += BATCH_SIZE) {
          const batch = data.items.slice(i, i + BATCH_SIZE);
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

    if (processedArticles.length > 0) {
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
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        articlesProcessed: processedArticles.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing RSS feeds:', error);
    return new Response(
      JSON.stringify({ error: 'Error al procesar los feeds RSS' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
