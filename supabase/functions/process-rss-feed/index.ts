
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function parseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return new Date().toISOString();
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log('Starting RSS feed processing...');

    const articles = [];
    const feedPromises = RSS_FEEDS.map(async (feed) => {
      try {
        console.log(`Fetching feed from: ${feed.name}`);
        const response = await fetch(feed.url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.items) {
          console.error(`No items found in feed: ${feed.name}`);
          return [];
        }

        return Promise.all(data.items.map(async (item: any) => {
          try {
            // Process with OpenAI
            const analysis = await analyzeArticle(item.title, item.description || '');
            
            return {
              title: item.title,
              description: item.description || '',
              link: item.url || item.link,
              pub_date: parseDate(item.date_published || item.pubDate || item.published),
              source: feed.name,
              summary: analysis.summary,
              category: analysis.category,
              clients: analysis.clients,
              keywords: analysis.keywords,
              image_url: extractImageUrl(item),
            };
          } catch (error) {
            console.error(`Error processing article from ${feed.name}:`, error);
            return null;
          }
        }));
      } catch (error) {
        console.error(`Error fetching feed ${feed.name}:`, error);
        return [];
      }
    });

    const results = await Promise.all(feedPromises);
    const allArticles = results.flat().filter(article => article !== null);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert articles into database
    const { data, error } = await supabase
      .from('news_articles')
      .upsert(allArticles, { 
        onConflict: 'link',
        ignoreDuplicates: true 
      });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, articlesProcessed: allArticles.length }),
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

async function analyzeArticle(title: string, description: string) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const prompt = `
    Analiza este artículo de noticias y proporciona:
    1. Un resumen breve (3-5 oraciones)
    2. Categorízalo en UNA de estas categorías: ACCIDENTES, AGENCIAS DE GOBIERNO, AMBIENTE, AMBIENTE & EL TIEMPO, CIENCIA & TECNOLOGÍA, COMUNIDAD, CRIMEN, DEPORTES, ECONOMÍA & NEGOCIOS, EDUCACIÓN & CULTURA, EE.UU. & INTERNACIONALES, ENTRETENIMIENTO, GOBIERNO, OTRAS, POLÍTICA, RELIGIÓN, SALUD, TRIBUNALES
    3. Identifica si alguno de estos clientes es relevante: First Medical, Menonita, MMM, Auxilio Mutuo, Pavía, Therapy Network, Merck, Infinigen, NF Energía, AES, Ford, Ética Gubernamental, Municipio de Naguabo, PROMESA, Coop de Seguros Múltiples, Telemundo, Para la Naturaleza, Cruz Roja Americana, Hospital del Niño, Serrallés, McDonald's, Metropistas
    4. Extrae palabras clave relevantes

    Título: ${title}
    Descripción: ${description}

    Responde en formato JSON:
    {
      "summary": "string",
      "category": "string",
      "clients": ["string"],
      "keywords": ["string"]
    }
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
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
    console.error('Error analyzing article:', error);
    return {
      summary: 'Error al analizar el artículo',
      category: 'OTRAS',
      clients: [],
      keywords: []
    };
  }
}

