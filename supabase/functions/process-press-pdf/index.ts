
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
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
 * Uses Gemini API to analyze text and identify press clippings
 */
async function analyzePressClippings(pageText: string, pageNumber: number): Promise<any[]> {
  try {
    console.log(`Analyzing page ${pageNumber} with Gemini (${pageText.length} chars)...`);
    
    const prompt = `
INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE en español con estructura JSON exacta.

Eres un experto analista de prensa escrita de Puerto Rico y el Caribe.

Analiza el siguiente texto de un periódico y extrae TODOS los recortes de prensa (press clippings).

Categorías disponibles: ${publimediaCategories.join(', ')}

Clientes relevantes: ${Object.entries(publimediaClients)
  .map(([cat, clients]) => `${cat}: ${(clients as string[]).join(', ')}`)
  .join('; ')}

Para CADA recorte encontrado, extrae:
- título de la noticia
- texto completo del artículo
- categoría (de la lista disponible)
- quién (personas/organizaciones mencionadas)
- qué (evento o situación principal)
- cuándo (fecha/hora del evento)
- dónde (lugar del evento)
- por qué (razones o causas)
- palabras clave relevantes
- clientes potencialmente interesados

RESPONDE CON ESTA ESTRUCTURA JSON EXACTA:
{
  "recortes": [
    {
      "titulo": "título",
      "contenido": "texto completo",
      "categoria": "categoría",
      "quien": "personas/organizaciones",
      "que": "evento principal",
      "cuando": "fecha/hora",
      "donde": "lugar",
      "porque": "razones",
      "palabras_clave": ["palabra1", "palabra2"],
      "relevancia_clientes": ["cliente1", "cliente2"]
    }
  ]
}

Texto de la página ${pageNumber}:
${pageText}
`;

    // Call Gemini API with structured JSON output
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.error("No content in Gemini response");
      return [];
    }

    const parsedContent = JSON.parse(content);
    const clippings = parsedContent.recortes || [];
    
    // Map Spanish fields to database schema
    return clippings.map((clip: any) => ({
      title: clip.titulo || "",
      content: clip.contenido || "",
      category: clip.categoria || "OTRAS",
      summary_who: clip.quien || "",
      summary_what: clip.que || "",
      summary_when: clip.cuando || "",
      summary_where: clip.donde || "",
      summary_why: clip.porque || "",
      keywords: clip.palabras_clave || [],
      client_relevance: clip.relevancia_clientes || [],
      page_number: pageNumber
    }));

  } catch (error) {
    console.error("Error analyzing with Gemini:", error);
    return [];
  }
}

/**
 * Process image files (JPG/PNG) or scanned PDF pages with Gemini Vision
 */
async function processImageWithGeminiVision(
  imageBlob: Blob,
  fileName: string,
  pageNumber: number
): Promise<any[]> {
  try {
    console.log(`Processing image with Gemini Vision: ${fileName}, page ${pageNumber}`);
    
    // Upload image to Gemini File API
    const fileInfo = await uploadImageToGemini(imageBlob, fileName);
    
    // Build analysis prompt
    const prompt = `
INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE en español con estructura JSON exacta.

Eres un experto analista de prensa escrita de Puerto Rico y el Caribe.

Analiza esta imagen de un periódico o revista. Primero, extrae TODO el texto visible usando OCR.
Luego, identifica todos los recortes de prensa (artículos de noticias) que encuentres.

Categorías disponibles: ${publimediaCategories.join(', ')}

Clientes relevantes: ${Object.entries(publimediaClients)
  .map(([cat, clients]) => `${cat}: ${(clients as string[]).join(', ')}`)
  .join('; ')}

RESPONDE CON ESTA ESTRUCTURA JSON EXACTA:
{
  "recortes": [
    {
      "titulo": "título",
      "contenido": "texto completo extraído con OCR",
      "categoria": "categoría",
      "quien": "personas/organizaciones",
      "que": "evento principal",
      "cuando": "fecha/hora",
      "donde": "lugar",
      "porque": "razones",
      "palabras_clave": ["palabra1", "palabra2"],
      "relevancia_clientes": ["cliente1", "cliente2"]
    }
  ]
}
`;

    // Call Gemini Vision API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                fileData: {
                  mimeType: fileInfo.mimeType,
                  fileUri: fileInfo.uri
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) return [];

    const parsedContent = JSON.parse(content);
    const clippings = parsedContent.recortes || [];
    
    // Cleanup uploaded file
    await cleanupGeminiFile(fileInfo.name);
    
    return clippings.map((clip: any) => ({
      title: clip.titulo || "",
      content: clip.contenido || "",
      category: clip.categoria || "OTRAS",
      summary_who: clip.quien || "",
      summary_what: clip.que || "",
      summary_when: clip.cuando || "",
      summary_where: clip.donde || "",
      summary_why: clip.porque || "",
      keywords: clip.palabras_clave || [],
      client_relevance: clip.relevancia_clientes || [],
      page_number: pageNumber
    }));

  } catch (error) {
    console.error("Error processing image with Gemini Vision:", error);
    return [];
  }
}

/**
 * Upload image to Gemini File API
 */
async function uploadImageToGemini(
  imageBlob: Blob,
  displayName: string
): Promise<{ uri: string; mimeType: string; name: string }> {
  try {
    // Initialize resumable upload
    const initResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': imageBlob.size.toString(),
          'X-Goog-Upload-Header-Content-Type': imageBlob.type,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: { display_name: displayName }
        })
      }
    );

    if (!initResponse.ok) {
      throw new Error(`Failed to initialize upload: ${initResponse.status}`);
    }

    const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) throw new Error('No upload URL received');

    // Upload the image data
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': imageBlob.size.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: imageBlob
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileUri = uploadResult.file?.uri;
    if (!fileUri) throw new Error('No file URI received');

    // Wait for Gemini to process the file
    await waitForFileProcessing(uploadResult.file.name);

    return {
      uri: fileUri,
      mimeType: imageBlob.type,
      name: uploadResult.file.name
    };
  } catch (error) {
    throw new Error(`Image upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Wait for Gemini to finish processing uploaded file
 */
async function waitForFileProcessing(fileName: string): Promise<void> {
  const maxAttempts = 15;
  const baseDelay = 3000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          await new Promise(resolve => setTimeout(resolve, baseDelay));
          continue;
        }
        throw new Error(`Failed to check file status: ${response.status}`);
      }

      const fileInfo = await response.json();
      
      if (fileInfo.state === 'ACTIVE') {
        console.log('File processing completed');
        return;
      } else if (fileInfo.state === 'FAILED') {
        throw new Error('File processing failed');
      }

      await new Promise(resolve => setTimeout(resolve, baseDelay));
      
    } catch (error) {
      if (attempt === maxAttempts) {
        console.log('File processing timeout, continuing...');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

/**
 * Delete uploaded file from Gemini
 */
async function cleanupGeminiFile(fileName: string): Promise<void> {
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`,
      { method: 'DELETE' }
    );
  } catch (error) {
    console.error('Failed to cleanup Gemini file:', error);
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
 * Generate embedding using Gemini text-embedding-004 model
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            parts: [{ text: text }]
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Embedding API error:", errorText);
      throw new Error(`Embedding generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding?.values || [];
    
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Download a file from Supabase Storage
 */
async function downloadFileFromStorage(supabase: any, filePath: string): Promise<ArrayBuffer> {
  console.log(`Downloading file from storage: ${filePath}`);
  
  try {
    const [bucketId, ...pathParts] = filePath.split('/');
    const path = pathParts.join('/');
    
    const { data, error } = await supabase
      .storage
      .from(bucketId)
      .download(path);
    
    if (error) {
      console.error("Error downloading file from storage:", error);
      throw new Error("Failed to download file from storage");
    }
    
    if (!data) {
      throw new Error("No data returned from storage download");
    }
    
    return await data.arrayBuffer();
  } catch (error) {
    console.error("Exception downloading file from storage:", error);
    throw error;
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Received request to process file");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
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
      progress: 5,
      error: null
    });
    
    // Download the file from storage
    let fileData;
    try {
      fileData = await downloadFileFromStorage(supabase, job.file_path);
      console.log(`Successfully downloaded file with size: ${fileData.byteLength} bytes`);
    } catch (error) {
      console.error("Error downloading file:", error);
      await updateProcessingJob(supabase, jobId, { 
        status: 'error',
        error: 'Failed to download file'
      });
      
      return new Response(JSON.stringify({ error: 'Failed to download file' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Detect file type
    const fileExtension = job.file_path.split('.').pop()?.toLowerCase();
    const isImageFile = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension || '');

    let allClippings = [];

    if (isImageFile) {
      console.log('Processing image file directly with Gemini Vision');
      
      // Convert ArrayBuffer to Blob
      const mimeType = fileExtension === 'png' ? 'image/png' : 
                       fileExtension === 'webp' ? 'image/webp' : 'image/jpeg';
      const imageBlob = new Blob([fileData], { type: mimeType });
      
      // Process with Gemini Vision
      allClippings = await processImageWithGeminiVision(
        imageBlob,
        job.file_path,
        1
      );
      
      if (allClippings.length === 0) {
        await updateProcessingJob(supabase, jobId, {
          status: 'completed',
          progress: 100,
          error: 'No se encontraron recortes en la imagen'
        });
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No clippings found in image',
            clippings: [],
            jobId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // PDF processing - use Gemini Vision directly
      console.log('Processing PDF with Gemini Vision');
      
      const pdfBlob = new Blob([fileData], { type: 'application/pdf' });
      
      // Process with Gemini Vision
      allClippings = await processImageWithGeminiVision(
        pdfBlob,
        job.file_path,
        1
      );
    }
    
    // Handle case where no clippings were found
    if (allClippings.length === 0) {
      console.warn("No clippings found");
      await updateProcessingJob(supabase, jobId, {
        status: 'completed',
        progress: 100,
        error: 'No se encontraron recortes'
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No clippings found',
          clippings: [],
          jobId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing ${allClippings.length} total clippings...`);
    await updateProcessingJob(supabase, jobId, { progress: 95 });
    
    // Get authenticated user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || job.user_id;
    
    // Process and store clippings
    const processedClippings = [];
    for (const clipping of allClippings) {
      try {
        // Enhance client relevance with additional matching
        const enhancedClientRelevance = [
          ...new Set([
            ...(clipping.client_relevance || []),
            ...identifyClientRelevance(clipping)
          ])
        ];
        
        // Generate embedding for semantic search
        const embeddingText = `${clipping.title} ${clipping.content}`.substring(0, 8000);
        const embedding = await generateEmbedding(embeddingText);
        
        // Store in database
        const { data: savedClipping, error: insertError } = await supabase
          .from('press_clippings')
          .insert({
            title: clipping.title,
            content: clipping.content,
            category: clipping.category,
            summary_who: clipping.summary_who,
            summary_what: clipping.summary_what,
            summary_when: clipping.summary_when,
            summary_where: clipping.summary_where,
            summary_why: clipping.summary_why,
            keywords: clipping.keywords,
            client_relevance: enhancedClientRelevance,
            page_number: clipping.page_number,
            publication_name: job.publication_name,
            publication_date: new Date().toISOString(),
            user_id: userId,
            embedding: `[${embedding.join(',')}]`
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error inserting clipping:", insertError);
        } else {
          processedClippings.push(savedClipping);
        }
      } catch (error) {
        console.error("Error processing clipping:", error);
      }
    }
    
    // Update job to completed
    await updateProcessingJob(supabase, jobId, {
      status: 'completed',
      progress: 100
    });
    
    console.log(`Successfully processed ${processedClippings.length} clippings`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedClippings.length} clippings`,
        clippings: processedClippings,
        jobId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
