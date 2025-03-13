import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

// Using CDN import for PDF.js that works in Deno
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
 * Use OpenAI Vision API to extract text from image-based PDFs
 */
async function extractTextWithVisionAPI(pageImage: string, pageNumber: number): Promise<{pageNumber: number, text: string}> {
  try {
    console.log(`Processing page ${pageNumber} with OpenAI Vision API...`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: 'Extract ALL text content from this page of a newspaper or magazine. Return ONLY the extracted text, with paragraph breaks preserved. Do not include any commentary, analysis, or description of images.' 
              },
              {
                type: 'image_url',
                image_url: {
                  url: pageImage
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI Vision API error:", error);
      throw new Error(`OpenAI Vision API error: ${error}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content;
    
    console.log(`Vision API extracted ${extractedText.length} characters from page ${pageNumber}`);
    
    return {
      pageNumber,
      text: extractedText
    };
  } catch (error) {
    console.error("Error using Vision API for text extraction:", error);
    throw error;
  }
}

/**
 * Convert PDF page to base64 encoded image for Vision API
 */
async function convertPdfPageToImage(pdfData: ArrayBuffer, pageNumber: number): Promise<string> {
  try {
    console.log(`Converting page ${pageNumber} to image...`);
    
    // Initialize PDF.js for Deno environment
    if (!globalThis.pdfjsLib) {
      // @ts-ignore: Set global pdfjsLib for Deno environment
      globalThis.pdfjsLib = pdfjs;
    }
    
    // Set up GlobalWorkerOptions properly for Deno
    if (!globalThis.pdfjsLib.GlobalWorkerOptions) {
      // @ts-ignore: Create GlobalWorkerOptions if it doesn't exist
      globalThis.pdfjsLib.GlobalWorkerOptions = {};
    }
    
    // Disable worker for Deno environment
    // @ts-ignore: Setting workerSrc to null for Deno
    globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({data: pdfData});
    const pdfDocument = await loadingTask.promise;
    
    // Get the page
    const page = await pdfDocument.getPage(pageNumber);
    
    // Set the desired scale - higher number = higher resolution
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    
    // Create a canvas element
    // @ts-ignore: Deno doesn't have built-in Canvas, we need to adapt the code
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Convert canvas to blob
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    
    // Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64String = btoa(String.fromCharCode.apply(null, uint8Array));
    
    return `data:image/png;base64,${base64String}`;
  } catch (error) {
    console.error(`Error converting page ${pageNumber} to image:`, error);
    throw error;
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
 * Process text from PDF pages in batches, with Vision API fallback
 */
async function processTextPages(supabase: any, jobId: string, pages: {pageNumber: number, text: string}[], pdfData: ArrayBuffer): Promise<any[]> {
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
      
      // For pages with very little text, try Vision API as a fallback
      if (page.text.length < 100) {
        console.log(`Page ${page.pageNumber} has limited text (${page.text.length} chars), trying Vision API...`);
        try {
          const pageImage = await convertPdfPageToImage(pdfData, page.pageNumber);
          const visionResult = await extractTextWithVisionAPI(pageImage, page.pageNumber);
          
          // If Vision API returned a substantial amount of text, use it instead
          if (visionResult.text.length > page.text.length) {
            console.log(`Vision API extracted more text (${visionResult.text.length} chars vs ${page.text.length}), using Vision results`);
            page.text = visionResult.text;
          }
        } catch (visionError) {
          console.error(`Vision API fallback failed for page ${page.pageNumber}:`, visionError);
          // Continue with original text if Vision API fails
        }
      }
      
      // Process the page text (either original or enhanced by Vision API)
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
 * Extract text from a PDF file
 * This implementation has been completely revised to work reliably in Deno
 */
async function extractTextFromPdf(pdfData: ArrayBuffer): Promise<{pageNumber: number, text: string}[]> {
  try {
    console.log("Starting PDF text extraction with PDF.js...");
    
    // Initialize PDF.js for Deno environment
    if (!globalThis.pdfjsLib) {
      // @ts-ignore: Set global pdfjsLib for Deno environment
      globalThis.pdfjsLib = pdfjs;
    }
    
    // Set up GlobalWorkerOptions properly for Deno
    if (!globalThis.pdfjsLib.GlobalWorkerOptions) {
      // @ts-ignore: Create GlobalWorkerOptions if it doesn't exist
      globalThis.pdfjsLib.GlobalWorkerOptions = {};
    }
    
    // Disable worker for Deno environment
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
        
        if (pageText.length > 0) {
          textPages.push({
            pageNumber: i,
            text: pageText
          });
        } else {
          console.warn(`Page ${i} contains no extractable text`);
        }
      } catch (pageError) {
        console.error(`Error extracting text from page ${i}:`, pageError);
        // Continue with next page if one fails
      }
    }
    
    console.log(`Successfully extracted text from ${textPages.length} pages`);
    
    if (textPages.length === 0) {
      console.error("No text could be extracted from any page in the PDF");
      throw new Error("Failed to extract text from PDF: The document may be scan-based or image-only");
    }
    
    return textPages;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
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
      console.log(`Successfully downloaded PDF with size: ${pdfData.byteLength} bytes`);
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
    let isVisionRequired = false;
    try {
      textPages = await extractTextFromPdf(pdfData);
      await updateProcessingJob(supabase, jobId, { progress: 10 });
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      
      // If the error suggests this is a scan-based or image-only PDF, try Vision API
      if (error.message && error.message.includes("scan-based or image-only")) {
        console.log("PDF appears to be scan-based or image-only, switching to Vision API");
        isVisionRequired = true;
        
        // Create an empty text pages array so we can process with Vision API
        textPages = [];
        for (let i = 1; i <= 10; i++) { // Assume max 10 pages for safety
          try {
            // Try to get page count from PDF
            const loadingTask = pdfjs.getDocument({data: pdfData});
            const pdfDocument = await loadingTask.promise;
            const pageCount = pdfDocument.numPages;
            
            textPages = [];
            for (let i = 1; i <= pageCount; i++) {
              textPages.push({
                pageNumber: i,
                text: "" // Empty text to be filled by Vision API
              });
            }
            break;
          } catch (countError) {
            console.error("Error getting page count:", countError);
            // If we can't get page count, use 1 page as fallback
            textPages = [{ pageNumber: 1, text: "" }];
            break;
          }
        }
      } else {
        // For other errors, return error response
        await updateProcessingJob(supabase, jobId, { 
          status: 'error',
          error: error.message || 'Failed to extract text from PDF'
        });
        
        return new Response(JSON.stringify({ error: error.message || 'Failed to extract text from PDF' }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }
    
    console.log(`Extracted ${textPages.length} pages of text`);
    
    // If Vision API is required or text extraction produced empty results
    if (isVisionRequired || textPages.every(page => page.text.length < 100)) {
      console.log("Using Vision API for text extraction");
      await updateProcessingJob(supabase, jobId, { 
        progress: 15,
        status: 'processing',
        error: null
      });
      
      const visionPages = [];
      for (const page of textPages) {
        try {
          const pageImage = await convertPdfPageToImage(pdfData, page.pageNumber);
          const visionResult = await extractTextWithVisionAPI(pageImage, page.pageNumber);
          visionPages.push(visionResult);
        } catch (visionError) {
          console.error(`Vision API failed for page ${page.pageNumber}:`, visionError);
          // Keep the original page even if Vision failed
          visionPages.push(page);
        }
      }
      
      // Replace text pages with Vision API results if we got any
      if (visionPages.length > 0) {
        textPages = visionPages;
        console.log(`Replaced with ${visionPages.length} pages of Vision API extracted text`);
      }
    }
    
    // Process the text pages with regular text or Vision API extracted text
    const allClippings = await processTextPages(supabase, jobId, textPages, pdfData);
    
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
