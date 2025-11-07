
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
INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE en español con JSON válido.

Eres un analista de prensa de Puerto Rico.

FILTRO ESTRICTO: Solo incluye artículos/anuncios si:
- Menciona uno de estos clientes por nombre, O
- Trata del sector específico del cliente

Clientes: ${Object.entries(publimediaClients)
  .map(([cat, clients]) => `${cat}: ${(clients as string[]).join(', ')}`)
  .join('; ')}

Categorías: ${publimediaCategories.join(', ')}

Extrae SOLO: título, categoría, keywords (máx 5), clientes relevantes.

RESPONDE JSON:
{
  "recortes": [
    {
      "titulo": "título completo",
      "categoria": "categoría",
      "palabras_clave": ["palabra1", "palabra2"],
      "relevancia_clientes": ["cliente1"]
    }
  ]
}

Texto página ${pageNumber}:
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
            temperature: 0.2,
            topK: 20,
            topP: 0.7,
            maxOutputTokens: 3500,
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
      content: "",
      category: clip.categoria || "OTRAS",
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
 * Attempt to repair truncated JSON by extracting complete entries
 */
function attemptJSONRepair(truncatedJSON: string): any {
  try {
    console.log('Attempting JSON repair on truncated response...');
    
    // Try to extract the recortes array
    const match = truncatedJSON.match(/"recortes"\s*:\s*\[(.*)/s);
    if (!match) {
      console.log('No recortes array found in response');
      return null;
    }
    
    const arrayContent = match[1];
    const entries = [];
    let depth = 0;
    let currentEntry = '';
    let inString = false;
    let escapeNext = false;
    
    // Parse each complete object in the array
    for (const char of arrayContent) {
      if (escapeNext) {
        escapeNext = false;
        currentEntry += char;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        currentEntry += char;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') {
          depth--;
          currentEntry += char;
          
          if (depth === 0 && currentEntry.trim()) {
            try {
              const cleaned = currentEntry.trim().replace(/,$/, '');
              const parsed = JSON.parse(cleaned);
              entries.push(parsed);
              currentEntry = '';
            } catch (e) {
              console.log('Failed to parse entry, continuing...', e);
              currentEntry = '';
            }
          }
          continue;
        }
      }
      
      if (depth > 0) {
        currentEntry += char;
      }
    }
    
    console.log(`JSON repair extracted ${entries.length} complete entries`);
    return entries.length > 0 ? { recortes: entries } : null;
  } catch (error) {
    console.error('JSON repair failed:', error);
    return null;
  }
}

/**
 * Process image files (JPG/PNG) or scanned PDF pages with Gemini Vision
 * Enhanced with comprehensive error handling and response debugging
 */
async function processImageWithGeminiVision(
  imageBlob: Blob,
  fileName: string,
  pageNumber: number
): Promise<any[]> {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Processing with Gemini Vision: ${fileName} (${(imageBlob.size / 1024 / 1024).toFixed(2)} MB), page ${pageNumber}, attempt ${attempt}/${maxRetries}`);
      
      // Upload image to Gemini File API
      const fileInfo = await uploadImageToGemini(imageBlob, fileName);
      console.log(`File uploaded successfully: ${fileInfo.uri}`);
      
      // Highly optimized prompt - only extract client-relevant articles, minimal fields
      const prompt = `
INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE en español con JSON válido.

Eres un analista de prensa de Puerto Rico.

FILTRO ESTRICTO: Solo incluye artículos/anuncios si:
- Menciona uno de estos clientes por nombre, O
- Trata del sector específico del cliente

Clientes: ${Object.entries(publimediaClients)
  .map(([cat, clients]) => `${cat}: ${(clients as string[]).join(', ')}`)
  .join('; ')}

Categorías: ${publimediaCategories.join(', ')}

Extrae SOLO: título, categoría, keywords (máx 5), clientes relevantes.

RESPONDE JSON:
{
  "recortes": [
    {
      "titulo": "título completo",
      "categoria": "categoría",
      "palabras_clave": ["palabra1", "palabra2"],
      "relevancia_clientes": ["cliente1"]
    }
  ]
}

Si NO hay recortes relevantes: {"recortes": []}
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
              temperature: 0.2,
              topK: 20,
              topP: 0.7,
              maxOutputTokens: 3500,
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini Vision API error (${response.status}):`, errorText);
        throw new Error(`Gemini Vision API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Gemini response structure:', JSON.stringify(data).substring(0, 500));
      
      // Check for candidates
      const candidate = data.candidates?.[0];
      if (!candidate) {
        console.error('No candidates in Gemini response. Full response:', JSON.stringify(data));
        throw new Error('Gemini no devolvió candidatos de respuesta');
      }
      
      // Check finish reason for blocks/errors
      const finishReason = candidate.finishReason;
      console.log(`Finish reason: ${finishReason}`);
      
      if (finishReason === 'SAFETY') {
        console.error('Content blocked by safety filters');
        throw new Error('Contenido bloqueado por filtros de seguridad de Gemini');
      }
      
      if (finishReason === 'RECITATION') {
        console.error('Content blocked due to recitation/copyright');
        throw new Error('Contenido bloqueado por derechos de autor');
      }
      
      if (finishReason === 'MAX_TOKENS') {
        console.warn('Response truncated due to max tokens, attempting to parse partial results');
        
        // Try to extract content even if truncated
        const content = candidate?.content?.parts?.[0]?.text;
        
        if (content && content.includes('"recortes"')) {
          console.log('Attempting to repair truncated JSON...');
          const repairedData = attemptJSONRepair(content);
          if (repairedData && repairedData.recortes && repairedData.recortes.length > 0) {
            console.log(`Successfully extracted ${repairedData.recortes.length} clippings from truncated response`);
            await cleanupGeminiFile(fileInfo.name);
            
            return repairedData.recortes.map((clip: any) => ({
              title: clip.titulo || "",
              content: "",
              category: clip.categoria || "OTRAS",
              keywords: Array.isArray(clip.palabras_clave) ? clip.palabras_clave : [],
              relevant_clients: Array.isArray(clip.relevancia_clientes) ? clip.relevancia_clientes : [],
              page_number: pageNumber
            }));
          }
        }
        
        console.error('Could not repair truncated JSON, retrying with smaller chunk...');
        throw new Error('MAX_TOKENS_RETRY');
      }
      
      // Try to extract content
      const content = candidate?.content?.parts?.[0]?.text;
      
      if (!content) {
        console.error('No text content in response. Finish reason:', finishReason);
        console.error('Full candidate structure:', JSON.stringify(candidate, null, 2).substring(0, 1000));
        throw new Error(`Gemini no devolvió contenido de texto (reason: ${finishReason || 'UNKNOWN'})`);
      }

      console.log(`Received response (${content.length} chars)`);
      
      // Parse JSON response
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse Gemini response as JSON:', content.substring(0, 500));
        
        // Try to repair JSON before giving up
        const repairedData = attemptJSONRepair(content);
        if (repairedData && repairedData.recortes) {
          console.log(`JSON repair successful, recovered ${repairedData.recortes.length} clippings`);
          parsedContent = repairedData;
        } else {
          throw new Error('Respuesta JSON inválida de Gemini');
        }
      }
      
      const clippings = parsedContent.recortes || [];
      console.log(`Extracted ${clippings.length} clippings from page ${pageNumber}`);
      
      // Log if no clippings found
      if (clippings.length === 0) {
        console.warn('Gemini returned empty recortes array. This may indicate:');
        console.warn('  - PDF is too large or complex for single processing');
        console.warn('  - OCR quality is poor');
        console.warn('  - No recognizable articles in the document');
      }
      
      // Cleanup uploaded file
      await cleanupGeminiFile(fileInfo.name);
      
      const mappedClippings = clippings.map((clip: any) => ({
        title: clip.titulo || "",
        content: "",
        category: clip.categoria || "OTRAS",
        keywords: clip.palabras_clave || [],
        client_relevance: clip.relevancia_clientes || [],
        page_number: pageNumber
      }));
      
      return mappedClippings;

    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
      
      // If this is the last attempt, throw the error with full details
      if (attempt === maxRetries) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`CRITICAL: Gemini Vision failed after ${maxRetries} attempts`);
        throw new Error(`Gemini Vision processing failed after ${maxRetries} attempts: ${errorMsg}`);
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(2000 * attempt, 10000);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Should never reach here, but just in case
  throw lastError || new Error('Gemini Vision processing failed for unknown reason');
}

/**
 * Process large PDFs by splitting into chunks (for files > 20MB)
 */
async function processLargePDFInChunks(
  pdfBlob: Blob,
  fileName: string,
  supabase: any,
  jobId: string
): Promise<any[]> {
  const fileSizeMB = pdfBlob.size / 1024 / 1024;
  console.log(`Processing large PDF (${fileSizeMB.toFixed(2)} MB) in chunks...`);
  
  // Estimate page count (more realistic estimate: 500KB per page)
  const estimatedPages = Math.ceil(pdfBlob.size / (500 * 1024));
  console.log(`Estimated pages: ${estimatedPages}`);
  
  // Define chunk size in pages (smaller chunks for reliability: 1-2 pages at a time)
  const pagesPerChunk = Math.min(2, Math.max(1, Math.floor(estimatedPages / 12)));
  const totalChunks = Math.ceil(estimatedPages / pagesPerChunk);
  
  console.log(`Will process in ${totalChunks} chunks of ~${pagesPerChunk} pages each`);
  
  let allClippings: any[] = [];
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const startPage = chunkIndex * pagesPerChunk + 1;
    const endPage = Math.min((chunkIndex + 1) * pagesPerChunk, estimatedPages);
    
    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}: pages ${startPage}-${endPage}`);
    
    // Update progress (10% to 80% range)
    const progress = 10 + Math.floor((chunkIndex / totalChunks) * 70);
    await updateProcessingJob(supabase, jobId, { 
      progress,
      error: null
    });
    
    try {
      // Process this chunk with Gemini Vision
      const chunkClippings = await processImageWithGeminiVision(
        pdfBlob,
        `${fileName}_chunk_${chunkIndex + 1}`,
        startPage
      );
      
      console.log(`Chunk ${chunkIndex + 1} returned ${chunkClippings.length} clippings`);
      allClippings.push(...chunkClippings);
      
      // Longer delay between chunks to avoid rate limits
      if (chunkIndex < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error processing chunk ${chunkIndex + 1}:`, errorMsg);
      
      // Update job with error details but continue processing other chunks
      await updateProcessingJob(supabase, jobId, {
        error: `Error en chunk ${chunkIndex + 1}/${totalChunks}: ${errorMsg}`
      });
      
      // Continue with other chunks even if one fails
    }
  }
  
  console.log(`Chunked processing complete. Total clippings: ${allClippings.length}`);
  return allClippings;
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
 * Increased timeout for large PDF files (40-50 MB)
 */
async function waitForFileProcessing(fileName: string): Promise<void> {
  const maxAttempts = 60; // Increased from 15 to 60 (5 minutes total)
  const baseDelay = 5000; // Increased from 3s to 5s
  
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
          console.log(`Waiting for file processing... Attempt ${attempt}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, baseDelay));
          continue;
        }
        throw new Error(`Failed to check file status: ${response.status}`);
      }

      const fileInfo = await response.json();
      console.log(`File state: ${fileInfo.state} (attempt ${attempt}/${maxAttempts})`);
      
      if (fileInfo.state === 'ACTIVE') {
        console.log('File processing completed successfully');
        return;
      } else if (fileInfo.state === 'FAILED') {
        throw new Error('Gemini file processing failed');
      } else if (fileInfo.state === 'PROCESSING') {
        console.log('File still processing...');
      }

      await new Promise(resolve => setTimeout(resolve, baseDelay));
      
    } catch (error) {
      console.error(`Error checking file status (attempt ${attempt}/${maxAttempts}):`, error);
      if (attempt === maxAttempts) {
        console.warn('File processing timeout reached, continuing with best effort...');
        return;
      }
      // Exponential backoff for errors
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
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
    
    // Wrap processing in comprehensive try-catch
    try {
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
      // PDF processing with smart chunking for large files
      const fileSizeMB = fileData.byteLength / 1024 / 1024;
      console.log(`Processing PDF (${fileSizeMB.toFixed(2)} MB)`);
      
      // Estimate page count (more realistic estimate: 500KB per page)
      const estimatedPages = Math.ceil(fileData.byteLength / (500 * 1024));
      console.log(`Estimated pages: ${estimatedPages}`);
      
      // Update progress
      await updateProcessingJob(supabase, jobId, { 
        progress: 10,
        error: null
      });
      
      const pdfBlob = new Blob([fileData], { type: 'application/pdf' });
      
      // Use batch processing for larger multi-page PDFs (>10MB or >10 pages)
      // This ensures ALL pages are analyzed, not just the first page
      const shouldUseBatchProcessing = fileSizeMB > 10 || estimatedPages > 10;
      
      if (shouldUseBatchProcessing) {
        console.log(`Multi-page PDF detected (est. ${estimatedPages} pages), using batch processing to analyze ALL pages...`);
        allClippings = await processLargePDFInChunks(
          pdfBlob,
          job.file_path,
          supabase,
          jobId
        );
      } else {
        // Only for very small single-page PDFs (< 5MB and < 3 pages)
        console.log('Processing small single-page PDF directly...');
        allClippings = await processImageWithGeminiVision(
          pdfBlob,
          job.file_path,
          1
        );
      }
      
      console.log(`PDF processing returned ${allClippings.length} total clippings`);
      
      // Update progress after processing
      await updateProcessingJob(supabase, jobId, { 
        progress: 80,
        error: null
      });
      }
      
    } catch (processingError) {
      const errorMsg = processingError instanceof Error ? processingError.message : String(processingError);
      console.error("CRITICAL: PDF/Image processing failed:", errorMsg);
      console.error("Full error details:", processingError);
      
      // Update database with detailed error
      await updateProcessingJob(supabase, jobId, {
        status: 'error',
        error: `Error procesando archivo: ${errorMsg}`,
        progress: 60
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Processing failed',
          details: errorMsg,
          jobId
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
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
    
    // Generate document-level summary
    console.log('Generating document summary...');
    let documentSummary = '';
    
    if (allClippings.length > 0) {
      try {
        const allTitles = allClippings.map(c => c.title).join(', ');
        const allCategories = [...new Set(allClippings.map(c => c.category))].join(', ');
        
        const summaryPrompt = `Resume este documento de prensa en 2-3 oraciones. 
Artículos encontrados: ${allTitles}
Categorías: ${allCategories}
Proporciona un resumen ejecutivo general.`;

        const summaryResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: summaryPrompt }] }],
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 500
              }
            })
          }
        );

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          documentSummary = summaryData.candidates?.[0]?.content?.parts?.[0]?.text || 
            `Documento de ${job.publication_name} con ${allClippings.length} artículos relevantes en categorías: ${allCategories}`;
        }
      } catch (error) {
        console.error('Error generating summary:', error);
        documentSummary = `Documento de ${job.publication_name} con ${allClippings.length} artículos relevantes`;
      }
    }
    
    // Filter for client-relevant clippings only
    const preFilterCount = allClippings.length;
    allClippings = allClippings.filter(clipping => {
      const clientRelevance = [
        ...new Set([
          ...(clipping.client_relevance || []),
          ...identifyClientRelevance(clipping)
        ])
      ];
      return clientRelevance.length > 0;
    });
    
    console.log(`Filtered to ${allClippings.length} client-relevant clippings (from ${preFilterCount} total)`);
    console.log(`Processing ${allClippings.length} client-relevant clippings...`);
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
    
    // Update job to completed with document summary
    await updateProcessingJob(supabase, jobId, {
      status: 'completed',
      progress: 100,
      document_summary: documentSummary
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
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("CRITICAL: Edge function error:", errorMsg);
    console.error("Full error stack:", error);
    
    // Try to extract jobId from request if available
    let jobId;
    try {
      const body = await req.clone().json();
      jobId = body.jobId;
    } catch {}
    
    // Update database if we have a jobId
    if (jobId) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await updateProcessingJob(supabase, jobId, {
          status: 'error',
          error: `Error crítico: ${errorMsg}`,
          progress: 0
        });
      } catch (dbError) {
        console.error("Failed to update job status in error handler:", dbError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMsg,
        jobId
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
