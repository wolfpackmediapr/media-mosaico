
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Predefined categories from Publimedia
const publimediaCategories = [
  'ACCIDENTES', 'AGENCIAS DE GOBIERNO', 'AMBIENTE', 'AMBIENTE & EL TIEMPO', 'CIENCIA & TECNOLOGIA',
  'COMUNIDAD', 'CRIMEN', 'DEPORTES', 'ECONOMIA & NEGOCIOS', 'EDUCACION & CULTURA',
  'EE.UU. & INTERNACIONALES', 'ENTRETENIMIENTO', 'GOBIERNO', 'OTRAS', 'POLITICA',
  'RELIGION', 'SALUD', 'TRIBUNALES'
];

// Client categories and their associated keywords
const publimediaClients = {
  'SALUD': ['First Medical', 'Menonita', 'MMM', 'Auxilio Mutuo', 'Pavia', 'Therapy Network', 'Merck'],
  'ENERGIA': ['Infinigen', 'NF Energia', 'AES'],
  'AUTOS': ['Ford'],
  'GOBIERNO': ['Etica Gubernamental', 'Municipio de Naguabo', 'PROMESA'],
  'SEGUROS': ['Coop de Seg Multiples'],
  'TELEVISION': ['Telemundo'],
  'AMBIENTE': ['Para la Naturaleza'],
  'INSTITUCIONES SIN FINES DE LUCRO': ['Cruz Roja Americana', 'Hospital del niño'],
  'ALCOHOL': ['Serrallés'],
  'COMIDA RAPIDA': ['McDonald\'s'],
  'CARRETERAS': ['Metropistas']
};

/**
 * Extracts text from a PDF buffer using PDF.js
 */
async function extractTextFromPdf(buffer: ArrayBuffer): Promise<{pageNumber: number, text: string}[]> {
  try {
    // Note: In a real implementation, we'd use PDF.js or a similar library
    // For this demo, we'll simulate PDF text extraction with a placeholder
    console.log("Extracting text from PDF buffer of size:", buffer.byteLength);
    
    // Simulate extraction of 3 pages
    return [
      { pageNumber: 1, text: "Sample extracted text from page 1..." },
      { pageNumber: 2, text: "Sample extracted text from page 2..." },
      { pageNumber: 3, text: "Sample extracted text from page 3..." }
    ];
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Uses OpenAI to analyze text and identify press clippings
 */
async function analyzePressClippings(pageText: string, pageNumber: number): Promise<any[]> {
  try {
    const prompt = `
      Analiza el siguiente texto de un periódico digital y extrae los recortes de prensa (press clippings).
      Para cada recorte, proporciona:
      - title: Un título conciso para la noticia
      - content: El texto completo de la noticia
      - category: Selecciona UNA categoría de la lista: ${publimediaCategories.join(', ')}
      - summary_who: Personas o entidades involucradas
      - summary_what: El evento o situación principal
      - summary_when: Fecha y hora del evento
      - summary_where: Lugar del evento
      - summary_why: Razones o causas
      - keywords: Un array de palabras relevantes para la categoría

      Formato la respuesta como un array JSON de objetos con las propiedades anteriores.
      Texto: ${pageText}
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    console.log("OpenAI response:", JSON.stringify(data).substring(0, 200) + "...");
    
    let clippings = [];
    try {
      const responseContent = data.choices[0].message.content;
      const parsedContent = JSON.parse(responseContent);
      clippings = parsedContent.clippings || [];
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      return [];
    }

    // Add page number to each clipping
    return clippings.map((clip: any) => ({
      ...clip,
      page_number: pageNumber
    }));
  } catch (error) {
    console.error("Error analyzing press clippings:", error);
    return [];
  }
}

/**
 * Identifies relevant clients for a clipping based on category and keywords
 */
function identifyClientRelevance(clipping: any): string[] {
  const relevantClients: string[] = [];
  
  // Check if the clipping category matches any client category
  for (const [category, clients] of Object.entries(publimediaClients)) {
    // Direct category match
    if (clipping.category.includes(category)) {
      relevantClients.push(...clients as string[]);
      continue;
    }
    
    // Keyword matches
    if (clipping.keywords && Array.isArray(clipping.keywords)) {
      const keywordMatches = clipping.keywords.some((keyword: string) => 
        (clients as string[]).some(client => 
          keyword.toLowerCase().includes(client.toLowerCase())
        )
      );
      
      if (keywordMatches) {
        relevantClients.push(...clients as string[]);
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(relevantClients)];
}

/**
 * Generates embedding for text content using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI Embedding API error:", error);
      throw new Error(`OpenAI Embedding API error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify that we have an authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const publicationName = formData.get('publicationName') as string;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!publicationName) {
      return new Response(JSON.stringify({ error: 'Publication name is required' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Process the PDF
    console.log(`Processing PDF: ${file.name}`);
    const buffer = await file.arrayBuffer();
    
    // Extract text from PDF
    const pages = await extractTextFromPdf(buffer);
    
    // Analyze each page for press clippings
    const allClippings = [];
    for (const page of pages) {
      const clippings = await analyzePressClippings(page.text, page.pageNumber);
      allClippings.push(...clippings);
    }
    
    console.log(`Found ${allClippings.length} press clippings`);
    
    // Process each clipping
    const processedClippings = [];
    for (const clipping of allClippings) {
      try {
        // Identify client relevance
        const clientRelevance = identifyClientRelevance(clipping);
        
        // Generate embedding
        const embedding = await generateEmbedding(clipping.content);
        
        // Store in database
        const { data, error: insertError } = await supabase
          .from('press_clippings')
          .insert({
            title: clipping.title,
            content: clipping.content,
            publication_name: publicationName,
            page_number: clipping.page_number,
            category: clipping.category,
            summary_who: clipping.summary_who,
            summary_what: clipping.summary_what,
            summary_when: clipping.summary_when,
            summary_where: clipping.summary_where,
            summary_why: clipping.summary_why,
            keywords: clipping.keywords || [],
            client_relevance: clientRelevance,
            embedding,
            user_id: user.id
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error inserting clipping:", insertError);
          continue;
        }
        
        // Create alert for relevant clients
        if (clientRelevance.length > 0) {
          const alertTitle = `Noticia relevante: ${clipping.title}`;
          const alertDescription = `Se encontró una noticia relevante en la categoría ${clipping.category} en la página ${clipping.page_number} de ${publicationName}`;
          
          await supabase
            .from('client_alerts')
            .insert({
              title: alertTitle,
              description: alertDescription,
              priority: 'normal',
              client_id: null // We don't have specific client IDs yet
            });
        }
        
        processedClippings.push({
          id: data.id,
          title: clipping.title,
          content: clipping.content.substring(0, 100) + '...',
          page_number: clipping.page_number,
          category: clipping.category,
          client_relevance: clientRelevance
        });
      } catch (error) {
        console.error("Error processing clipping:", error);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processedClippings.length} press clippings`,
        clippings: processedClippings
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing press PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
