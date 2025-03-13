
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

// Modified PDF.js import approach for Deno
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

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
 * Uses OpenAI to analyze text and identify press clippings
 */
async function analyzePressClippings(pageText: string, pageNumber: number): Promise<any[]> {
  try {
    console.log(`Analyzing page ${pageNumber} content with ${pageText.length} characters...`);
    
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

      Formato la respuesta como un array JSON, con una clave "clippings" que contiene un array de objetos con las propiedades anteriores.
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

/**
 * Updates processing job status and progress
 */
async function updateProcessingJob(supabase: any, jobId: string, updates: any) {
  try {
    const { error } = await supabase
      .from('pdf_processing_jobs')
      .update(updates)
      .eq('id', jobId);
    
    if (error) {
      console.error("Error updating processing job:", error);
    }
  } catch (err) {
    console.error("Exception updating processing job:", err);
  }
}

/**
 * Process text from PDF pages in batches
 */
async function processTextPages(supabase: any, jobId: string, pages: {pageNumber: number, text: string}[]): Promise<any[]> {
  const allClippings = [];
  const totalPages = pages.length;
  
  console.log(`Processing ${totalPages} pages of text`);
  
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    console.log(`Analyzing page ${page.pageNumber} (${page.text.length} characters)`);
    
    try {
      // Update progress
      const progress = Math.floor((i / totalPages) * 90) + 5; // 5-95% range for processing
      await updateProcessingJob(supabase, jobId, { progress });
      
      const clippings = await analyzePressClippings(page.text, page.pageNumber);
      console.log(`Found ${clippings.length} clippings on page ${page.pageNumber}`);
      allClippings.push(...clippings);
    } catch (error) {
      console.error(`Error processing page ${page.pageNumber}:`, error);
    }
  }
  
  return allClippings;
}

/**
 * Extract text from a PDF file downloaded from storage
 * This function has been updated to better handle Deno environment
 */
async function extractTextFromPdf(pdfData: ArrayBuffer): Promise<{pageNumber: number, text: string}[]> {
  try {
    console.log("Starting PDF text extraction...");
    
    // Initialize PDF.js (modified for Deno environment)
    if (!globalThis.pdfjsLib) {
      // @ts-ignore: Set global pdfjsLib for Deno environment
      globalThis.pdfjsLib = pdfjs;
    }
    
    // Handle globalThis.pdfjsLib.GlobalWorkerOptions for Deno
    if (!globalThis.pdfjsLib.GlobalWorkerOptions) {
      // @ts-ignore: Create GlobalWorkerOptions if it doesn't exist
      globalThis.pdfjsLib.GlobalWorkerOptions = {};
    }
    
    // Set workerSrc to null since we're in Deno and don't need a separate worker
    // @ts-ignore: Setting workerSrc to null for Deno
    globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    
    console.log("PDF.js initialization completed");
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({data: pdfData});
    console.log("PDF document loading task created");
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    console.log(`PDF document loaded with ${numPages} pages`);
    
    const textPages = [];
    
    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      try {
        console.log(`Getting page ${i}...`);
        const page = await pdfDocument.getPage(i);
        
        console.log(`Getting text content for page ${i}...`);
        const textContent = await page.getTextContent();
        
        // Combine all text items into a single string
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log(`Extracted ${pageText.length} characters from page ${i}`);
        
        textPages.push({
          pageNumber: i,
          text: pageText
        });
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
        // Continue with next page if one fails
      }
    }
    
    console.log(`Successfully extracted text from ${textPages.length} pages`);
    return textPages;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Download a PDF file from Supabase Storage
 */
async function downloadPdfFromStorage(supabase: any, filePath: string): Promise<ArrayBuffer> {
  console.log(`Downloading PDF from storage: ${filePath}`);
  
  try {
    // Extract bucket and path from filePath (format: bucket_id/path/to/file.pdf)
    const [bucketId, ...pathParts] = filePath.split('/');
    const path = pathParts.join('/');
    
    const { data, error } = await supabase
      .storage
      .from(bucketId)
      .download(path);
    
    if (error) {
      console.error("Error downloading PDF from storage:", error);
      throw new Error("Failed to download PDF from storage");
    }
    
    if (!data) {
      throw new Error("No data returned from storage download");
    }
    
    return await data.arrayBuffer();
  } catch (error) {
    console.error("Exception downloading PDF from storage:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Received request to process PDF");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse the request JSON
    const { jobId } = await req.json();
    
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Missing jobId parameter' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    console.log(`Processing job ID: ${jobId}`);
    
    // Get the job details
    const { data: job, error: jobError } = await supabase
      .from('pdf_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      console.error("Error fetching job:", jobError);
      return new Response(JSON.stringify({ error: 'Job not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Update job status to processing
    await updateProcessingJob(supabase, jobId, { 
      status: 'processing',
      progress: 5 // Start at 5%
    });
    
    // Download the PDF from storage
    let pdfData;
    try {
      pdfData = await downloadPdfFromStorage(supabase, job.file_path);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      await updateProcessingJob(supabase, jobId, { 
        status: 'error',
        error: 'Failed to download PDF file'
      });
      
      return new Response(JSON.stringify({ error: 'Failed to download PDF file' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Extract text from PDF
    let textPages;
    try {
      textPages = await extractTextFromPdf(pdfData);
      await updateProcessingJob(supabase, jobId, { progress: 10 });
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      await updateProcessingJob(supabase, jobId, { 
        status: 'error',
        error: 'Failed to extract text from PDF'
      });
      
      return new Response(JSON.stringify({ error: 'Failed to extract text from PDF' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    console.log(`Extracted ${textPages.length} pages of text`);
    
    // Process the text pages
    const allClippings = await processTextPages(supabase, jobId, textPages);
    
    console.log(`Found ${allClippings.length} press clippings in total`);
    await updateProcessingJob(supabase, jobId, { progress: 95 });
    
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
            publication_name: job.publication_name,
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
            user_id: job.user_id
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
          const alertDescription = `Se encontró una noticia relevante en la categoría ${clipping.category} en la página ${clipping.page_number} de ${job.publication_name}`;
          
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
          id: data?.id || `temp-${Date.now()}`,
          title: clipping.title,
          content: clipping.content,
          page_number: clipping.page_number,
          category: clipping.category,
          summary_who: clipping.summary_who,
          summary_what: clipping.summary_what,
          summary_when: clipping.summary_when,
          summary_where: clipping.summary_where,
          summary_why: clipping.summary_why,
          keywords: clipping.keywords,
          client_relevance: clientRelevance
        });
      } catch (error) {
        console.error("Error processing clipping:", error);
      }
    }
    
    // Update job status to completed
    await updateProcessingJob(supabase, jobId, { 
      status: 'completed',
      progress: 100
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processedClippings.length} press clippings`,
        clippings: processedClippings,
        jobId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing press PDF:', error);
    
    // Try to update job status if possible
    try {
      const { jobId } = await req.json();
      if (jobId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await updateProcessingJob(supabase, jobId, { 
          status: 'error',
          error: error.message || 'Unknown error occurred'
        });
      }
    } catch (e) {
      // Ignore errors here
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
