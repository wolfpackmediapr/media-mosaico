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
          await logProcessingError(supabase, {
            stage: 'parsing',
            error: `JSON parsing error: ${parseError.message}`,
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

    for (const feed of RSS_FEEDS) {
      try {
        const response = await fetch(feed.url);
        const articles = await response.json();

        for (const article of articles) {
          const { title, description, source } = article;
          await analyzeArticle(title, description, openAIApiKey, feed.name, supabase);
        }
      } catch (error) {
        console.error(`Error processing feed ${feed.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
