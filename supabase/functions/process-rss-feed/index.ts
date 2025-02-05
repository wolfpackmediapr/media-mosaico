
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { parse } from "https://deno.land/x/xml@2.1.1/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseDate(dateStr: string): string {
  try {
    // First try direct parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // If that fails, try handling specific RSS date formats
    // Handle RFC 822 format (common in RSS)
    const rfc822Date = new Date(dateStr.replace(/([\+\-]\d{4})/, ' UTC$1'));
    if (!isNaN(rfc822Date.getTime())) {
      return rfc822Date.toISOString();
    }

    // If all parsing attempts fail, return current date
    console.warn(`Could not parse date: ${dateStr}, using current date`);
    return new Date().toISOString();
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
    return new Date().toISOString();
  }
}

function extractImageUrl(item: any): string | null {
  // Try to get image from media:content
  if (item['media:content'] && item['media:content'][0]?.['@url']) {
    return item['media:content'][0]['@url'];
  }
  
  // Try to get image from enclosure
  if (item.enclosure && item.enclosure[0]?.['@url'] && item.enclosure[0]?.['@type']?.startsWith('image/')) {
    return item.enclosure[0]['@url'];
  }
  
  // Try to find image in description HTML
  if (item.description && item.description[0]) {
    const imgMatch = item.description[0].match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) {
      return imgMatch[1];
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    console.log('Processing RSS feed for user:', user_id);

    // Fetch RSS feed
    const response = await fetch('https://rss.app/feeds/_7yIWdawnxCYoCtbe.xml');
    const xmlText = await response.text();
    
    // Parse XML using the Deno XML parser
    const xmlDoc = parse(xmlText);
    const items = xmlDoc.rss.channel.item;
    
    const articles = [];
    for (const item of items) {
      const title = item.title?.[0] || '';
      const description = item.description?.[0] || '';
      const link = item.link?.[0] || '';
      const pubDate = item.pubDate?.[0] || '';
      const source = item.source?.[0]?.['#text'] || 'Unknown Source';
      const imageUrl = extractImageUrl(item);

      // Process with OpenAI
      const analysis = await analyzeArticle(title, description);
      
      articles.push({
        title,
        description,
        link,
        pub_date: parseDate(pubDate),
        source,
        summary: analysis.summary,
        category: analysis.category,
        clients: analysis.clients,
        keywords: analysis.keywords,
        image_url: imageUrl,
        user_id
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert articles into database
    const { data, error } = await supabase
      .from('news_articles')
      .upsert(articles, { 
        onConflict: 'link',
        ignoreDuplicates: true 
      });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, articles: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing RSS feed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
    Analyze this news article and provide:
    1. A brief summary (3-5 sentences)
    2. Categorize it into ONE of these categories: ACCIDENTES, AGENCIAS DE GOBIERNO, AMBIENTE, AMBIENTE & EL TIEMPO, CIENCIA & TECNOLOGÍA, COMUNIDAD, CRIMEN, DEPORTES, ECONOMÍA & NEGOCIOS, EDUCACIÓN & CULTURA, EE.UU. & INTERNACIONALES, ENTRETENIMIENTO, GOBIERNO, OTRAS, POLÍTICA, RELIGIÓN, SALUD, TRIBUNALES
    3. Identify if any of these clients are relevant: First Medical, Menonita, MMM, Auxilio Mutuo, Pavía, Therapy Network, Merck, Infinigen, NF Energía, AES, Ford, Ética Gubernamental, Municipio de Naguabo, PROMESA, Coop de Seguros Múltiples, Telemundo, Para la Naturaleza, Cruz Roja Americana, Hospital del Niño, Serrallés, McDonald's, Metropistas
    4. Extract relevant keywords

    Title: ${title}
    Description: ${description}

    Respond in JSON format:
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
          { role: 'system', content: 'You are a news analysis assistant.' },
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
      summary: 'Error analyzing article',
      category: 'OTRAS',
      clients: [],
      keywords: []
    };
  }
}
