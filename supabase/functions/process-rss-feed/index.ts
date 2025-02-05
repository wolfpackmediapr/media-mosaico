
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const items = xmlDoc.getElementsByTagName('item');
    
    const articles = [];
    for (const item of items) {
      const title = item.getElementsByTagName('title')[0]?.textContent || '';
      const description = item.getElementsByTagName('description')[0]?.textContent || '';
      const link = item.getElementsByTagName('link')[0]?.textContent || '';
      const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
      const source = item.getElementsByTagName('source')[0]?.textContent || 'Unknown Source';

      // Process with OpenAI
      const analysis = await analyzeArticle(title, description);
      
      articles.push({
        title,
        description,
        link,
        pub_date: new Date(pubDate).toISOString(),
        source,
        summary: analysis.summary,
        category: analysis.category,
        clients: analysis.clients,
        keywords: analysis.keywords,
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

    if (error) throw error;

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

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
