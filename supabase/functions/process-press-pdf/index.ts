import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Timeout helper to prevent hanging requests
function fetchWithTimeout(url: string | Request, options: RequestInit = {}, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(timeoutId));
}

// Retry configuration
const RETRY_CONFIG = {
  MAX_VISION_RETRIES: 3,        // Per-page API retries
  MAX_CHUNK_RETRIES: 2,          // Per-chunk retries
  MAX_PAGE_RETRIES: 2,           // Failed page retry pass
  CHUNK_RETRY_DELAY_MS: 3000,    // Base delay for chunk retries
  PAGE_RETRY_DELAY_MS: 5000,     // Delay for final retry pass
  MAX_BACKOFF_MS: 10000          // Maximum backoff time
};

// Default categories (fallback if database fetch fails)
const DEFAULT_CATEGORIES = [
  'ACCIDENTES', 'AGENCIAS DE GOBIERNO', 'AMBIENTE', 'AMBIENTE & EL TIEMPO', 'CIENCIA & TECNOLOGIA',
  'COMUNIDAD', 'CRIMEN', 'DEPORTES', 'ECONOMIA & NEGOCIOS', 'EDUCACION & CULTURA',
  'EE.UU. & INTERNACIONALES', 'ENTRETENIMIENTO', 'GOBIERNO', 'OTRAS', 'POLITICA',
  'RELIGION', 'SALUD', 'TRIBUNALES'
];

// Types for dynamic client data
interface ClientData {
  name: string;
  category: string;
  keywords: string[];
}

// Global cache for clients and categories (fetched once per invocation)
let cachedClientsData: {
  clients: ClientData[];
  categories: string[];
  clientsByCategory: Record<string, ClientData[]>;
  allClientNames: string[];
  allKeywords: string[];
} | null = null;

/**
 * Fetches clients and categories from the database
 */
async function fetchClientsAndCategories(supabase: any): Promise<typeof cachedClientsData> {
  if (cachedClientsData) {
    return cachedClientsData;
  }
  
  try {
    console.log('[Legacy] Fetching clients and categories from database...');
    
    // Fetch clients with keywords
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('name, category, keywords');
    
    if (clientsError) {
      console.error('[Legacy] Error fetching clients:', clientsError);
      throw clientsError;
    }
    
    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('name_es');
    
    if (categoriesError) {
      console.error('[Legacy] Error fetching categories:', categoriesError);
    }
    
    // Group clients by category and collect all names/keywords
    const clientsByCategory: Record<string, ClientData[]> = {};
    const clientList: ClientData[] = (clients || []).map((c: any) => ({
      name: c.name,
      category: c.category,
      keywords: c.keywords || []
    }));
    
    const allClientNames: string[] = [];
    const allKeywords: string[] = [];
    
    for (const client of clientList) {
      allClientNames.push(client.name);
      allKeywords.push(...client.keywords);
      
      if (!clientsByCategory[client.category]) {
        clientsByCategory[client.category] = [];
      }
      clientsByCategory[client.category].push(client);
    }
    
    const categoryList = categories?.map((c: any) => c.name_es) || DEFAULT_CATEGORIES;
    
    console.log(`[Legacy] Loaded ${clientList.length} clients with ${allKeywords.length} keywords in ${Object.keys(clientsByCategory).length} categories`);
    
    cachedClientsData = {
      clients: clientList,
      categories: categoryList,
      clientsByCategory,
      allClientNames: [...new Set(allClientNames)],
      allKeywords: [...new Set(allKeywords)]
    };
    
    return cachedClientsData;
  } catch (error) {
    console.error('[Legacy] Failed to fetch from database, using empty defaults:', error);
    cachedClientsData = {
      clients: [],
      categories: DEFAULT_CATEGORIES,
      clientsByCategory: {},
      allClientNames: [],
      allKeywords: []
    };
    return cachedClientsData;
  }
}

/**
 * Builds a prompt section with clients and their keywords for AI analysis
 */
function buildClientKeywordsPrompt(clientsByCategory: Record<string, ClientData[]>): string {
  if (Object.keys(clientsByCategory).length === 0) {
    return 'No hay clientes configurados. Extrae TODOS los artículos de prensa encontrados.';
  }
  
  const lines: string[] = [];
  for (const [category, clients] of Object.entries(clientsByCategory)) {
    const clientStrs = clients.map(c => {
      const keywords = c.keywords.length > 0 ? c.keywords.join(', ') : c.name;
      return `${c.name} (${keywords})`;
    });
    lines.push(`${category}: ${clientStrs.join('; ')}`);
  }
  return lines.join('\n');
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
 * Uses Gemini API to analyze text and identify press clippings
 */
async function analyzePressClippings(
  pageText: string, 
  pageNumber: number,
  clientsData: NonNullable<typeof cachedClientsData>
): Promise<any[]> {
  try {
    console.log(`Analyzing page ${pageNumber} with Gemini (${pageText.length} chars)...`);
    
    const hasClients = clientsData.clients.length > 0;
    const clientKeywordsPrompt = buildClientKeywordsPrompt(clientsData.clientsByCategory);
    
    const prompt = `
INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE en español con JSON válido.

Eres un analista de prensa de Puerto Rico.

${hasClients ? `BUSCA artículos que mencionen CUALQUIERA de estas palabras clave o nombres de clientes:
${clientKeywordsPrompt}

Si un artículo contiene cualquiera de estas palabras clave, inclúyelo.` : `No hay clientes configurados. Extrae TODOS los artículos de prensa encontrados.`}

Categorías: ${clientsData.categories.join(', ')}

Para cada artículo relevante, extrae:
- Título completo
- Contenido: 2-3 oraciones resumiendo el artículo
- Categoría
- Keywords (máx 5)
- Clientes relevantes (solo si coinciden con palabras clave)

RESPONDE JSON:
{
  "recortes": [
    {
      "titulo": "título completo",
      "contenido": "Breve análisis de 2-3 oraciones sobre el artículo",
      "categoria": "categoría",
      "palabras_clave": ["palabra1", "palabra2"],
      "relevancia_clientes": ["cliente1"]
    }
  ]
}

Texto página ${pageNumber}:
${pageText}
`;

    // Call Gemini API with structured JSON output (60s timeout)
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
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
            maxOutputTokens: 4000,
            responseMimeType: "application/json"
          }
        })
      },
      60000
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
      content: clip.contenido || clip.content || "",
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
  pageNumber: number,
  clientsData: NonNullable<typeof cachedClientsData>
): Promise<any[]> {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Processing with Gemini Vision: ${fileName} (${(imageBlob.size / 1024 / 1024).toFixed(2)} MB), page ${pageNumber}, attempt ${attempt}/${maxRetries}`);
      
      // Upload image to Gemini File API
      const fileInfo = await uploadImageToGemini(imageBlob, fileName);
      console.log(`File uploaded successfully: ${fileInfo.uri}`);
      
      const hasClients = clientsData.clients.length > 0;
      const clientKeywordsPrompt = buildClientKeywordsPrompt(clientsData.clientsByCategory);
      
      // Dynamic prompt based on available clients
      const prompt = `
RESPONDE SOLO JSON. NO explicaciones.

${hasClients ? `Extrae artículos que mencionen CUALQUIERA de estas palabras clave:
${clientKeywordsPrompt}` : `No hay clientes configurados. Extrae TODOS los artículos de prensa visibles.`}

Para cada artículo relevante proporciona:
- Título
- Contenido: 2-3 oraciones analizando el artículo
- Categoría
- Keywords
- Clientes relevantes

LÍMITE: Máximo 3 recortes por página.

JSON:
{"recortes":[{"titulo":"...","contenido":"Análisis breve...","categoria":"...","palabras_clave":["..."],"relevancia_clientes":["..."]}]}

Si NO aplica: {"recortes":[]}
`;

      // Call Gemini Vision API (120s timeout for image processing)
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
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
              maxOutputTokens: 4000,
              responseMimeType: "application/json"
            }
          })
        },
        120000
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
        console.warn(`Response truncated due to max tokens (attempt ${attempt}/${maxRetries})`);
        
        const textContent = candidate.content?.parts?.[0]?.text || '';
        const repaired = attemptJSONRepair(textContent);
        
        if (repaired && repaired.recortes && repaired.recortes.length > 0) {
          console.log(`✓ JSON repair recovered ${repaired.recortes.length} clippings`);
          await cleanupGeminiFile(fileInfo.name);
          
          return repaired.recortes.map((clip: any) => ({
            title: clip.titulo || "",
            content: clip.contenido || clip.content || "",
            category: clip.categoria || "OTRAS",
            keywords: clip.palabras_clave || [],
            client_relevance: clip.relevancia_clientes || [],
            page_number: pageNumber
          }));
        }
        
        // ✅ Throw error to trigger retry mechanism
        await cleanupGeminiFile(fileInfo.name);
        throw new Error(`MAX_TOKENS: JSON repair failed (attempt ${attempt}/${maxRetries})`);
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
        content: clip.contenido || clip.content || "",
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
  jobId: string,
  clientsData: NonNullable<typeof cachedClientsData>
): Promise<{ clippings: any[], retryStats: { totalPages: number, failedInitial: number, recovered: number, finalSuccessRate: number } }> {
  const fileSizeMB = pdfBlob.size / 1024 / 1024;
  console.log(`Processing large PDF (${fileSizeMB.toFixed(2)} MB) in chunks...`);
  
  // Estimate page count (more realistic estimate: 500KB per page)
  const estimatedPages = Math.ceil(pdfBlob.size / (500 * 1024));
  console.log(`Estimated pages: ${estimatedPages}`);
  
  // Process ONE page at a time for maximum reliability
  const pagesPerChunk = 1;
  const totalChunks = estimatedPages;
  
  console.log(`Will process in ${totalChunks} chunks of 1 page each`);
  
  let allClippings: any[] = [];
  const failedPages: Array<{
    chunkIndex: number;
    pageNumber: number;
    fileName: string;
    reason: string;
    attemptCount: number;
  }> = [];
  const PROCESSING_TIMEOUT_MS = 480000; // 8 minutes max
  const processingStartTime = Date.now();
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    // Check timeout
    if (Date.now() - processingStartTime > PROCESSING_TIMEOUT_MS) {
      console.error(`Processing timeout exceeded after ${chunkIndex} pages`);
      
      // Save what we have so far
      await updateProcessingJob(supabase, jobId, {
        status: 'completed',
        progress: 100,
        error: `Procesamiento parcial: ${allClippings.length} recortes extraídos de ${chunkIndex} de ${totalChunks} páginas antes del límite de tiempo`,
        document_summary: `Documento procesado parcialmente. Se analizaron ${chunkIndex} de ${totalChunks} páginas.`
      });
      
      break; // Exit loop gracefully
    }
    const startPage = chunkIndex * pagesPerChunk + 1;
    const endPage = Math.min((chunkIndex + 1) * pagesPerChunk, estimatedPages);
    
    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}: pages ${startPage}-${endPage}`);
    
    // Update progress (10% to 80% range)
    const progress = 10 + Math.floor((chunkIndex / totalChunks) * 70);
    await updateProcessingJob(supabase, jobId, { 
      progress,
      error: null
    });
    
    let chunkRetryCount = 0;
    let chunkSuccess = false;

    while (!chunkSuccess && chunkRetryCount <= RETRY_CONFIG.MAX_CHUNK_RETRIES) {
      try {
        const chunkClippings = await processImageWithGeminiVision(
          pdfBlob,
          `${fileName}_chunk_${chunkIndex + 1}`,
          startPage,
          clientsData
        );
        
        console.log(`Page ${chunkIndex + 1} returned ${chunkClippings.length} clippings`);
        allClippings.push(...chunkClippings);
        chunkSuccess = true; // ✓ Success, exit retry loop
        
        // Log progress with enhanced metrics
        const elapsedSeconds = Math.round((Date.now() - processingStartTime) / 1000);
        const failedCount = failedPages.length;
        const successRate = ((chunkIndex + 1 - failedCount) / (chunkIndex + 1) * 100).toFixed(1);
        
        console.log(`Progress: ${chunkIndex + 1}/${totalChunks} pages | ${allClippings.length} clippings | ${failedCount} failed | ${successRate}% success | ${elapsedSeconds}s elapsed`);
        
        // Shorter delay between chunks for faster processing
        if (chunkIndex < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        chunkRetryCount++;
        
        if (chunkRetryCount <= RETRY_CONFIG.MAX_CHUNK_RETRIES) {
          const waitTime = Math.min(RETRY_CONFIG.CHUNK_RETRY_DELAY_MS * chunkRetryCount, RETRY_CONFIG.MAX_BACKOFF_MS);
          console.warn(`⚠ Chunk ${chunkIndex + 1} failed (attempt ${chunkRetryCount}/${RETRY_CONFIG.MAX_CHUNK_RETRIES}): ${errorMsg}`);
          console.log(`Retrying in ${waitTime}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Final failure - add to retry queue
          console.error(`✗ Chunk ${chunkIndex + 1} failed after ${RETRY_CONFIG.MAX_CHUNK_RETRIES} retries: ${errorMsg}`);
          
          failedPages.push({
            chunkIndex,
            pageNumber: startPage,
            fileName: `${fileName}_chunk_${chunkIndex + 1}`,
            reason: errorMsg,
            attemptCount: 0
          });
          
          await updateProcessingJob(supabase, jobId, {
            error: `Error en página ${startPage} (se reintentará): ${errorMsg}`
          });
          
          break; // Exit retry loop, continue with next chunk
        }
      }
    }
  }
  
  console.log(`Chunked processing complete. Total clippings: ${allClippings.length}`);
  
  // Retry failed pages with adjusted settings
  if (failedPages.length > 0) {
    console.log(`\n=== RETRY PHASE: ${failedPages.length} failed pages ===`);
    
    for (const failedPage of failedPages) {
      if (failedPage.attemptCount >= RETRY_CONFIG.MAX_PAGE_RETRIES) {
        console.log(`Skipping page ${failedPage.pageNumber} (max retries reached)`);
        continue;
      }
      
      console.log(`Retrying page ${failedPage.pageNumber} (retry ${failedPage.attemptCount + 1}/${RETRY_CONFIG.MAX_PAGE_RETRIES})`);
      
      try {
        // Retry with increased delay
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.PAGE_RETRY_DELAY_MS));
        
        const retryClippings = await processImageWithGeminiVision(
          pdfBlob,
          failedPage.fileName,
          failedPage.pageNumber,
          clientsData
        );
        
        console.log(`✓ Retry successful: ${retryClippings.length} clippings recovered from page ${failedPage.pageNumber}`);
        allClippings.push(...retryClippings);
        
        // Mark as successfully recovered
        failedPage.attemptCount = RETRY_CONFIG.MAX_PAGE_RETRIES;
        
      } catch (error) {
        failedPage.attemptCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`✗ Retry failed for page ${failedPage.pageNumber}: ${errorMsg}`);
      }
    }
    
    // Calculate success rate
    const successfulRetries = failedPages.filter(p => p.attemptCount >= RETRY_CONFIG.MAX_PAGE_RETRIES).length;
    console.log(`Retry phase complete: ${successfulRetries}/${failedPages.length} pages recovered`);
  }
  
  // Calculate retry statistics
  const totalPages = totalChunks;
  const failedInitial = failedPages.length;
  const recovered = failedPages.filter(p => p.attemptCount >= RETRY_CONFIG.MAX_PAGE_RETRIES).length;
  const successfulPages = totalPages - failedInitial + recovered;
  const finalSuccessRate = (successfulPages / totalPages * 100);
  
  return {
    clippings: allClippings,
    retryStats: {
      totalPages,
      failedInitial,
      recovered,
      finalSuccessRate
    }
  };
}

/**
 * Upload image to Gemini File API
 */
async function uploadImageToGemini(
  imageBlob: Blob,
  displayName: string
): Promise<{ uri: string; mimeType: string; name: string }> {
  try {
    // Initialize resumable upload (30s timeout)
    const initResponse = await fetchWithTimeout(
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
      },
      30000
    );

    if (!initResponse.ok) {
      throw new Error(`Failed to initialize upload: ${initResponse.status}`);
    }

    const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) throw new Error('No upload URL received');

    // Upload the image data (60s timeout for large files)
    const uploadResponse = await fetchWithTimeout(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': imageBlob.size.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: imageBlob
    }, 60000);

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
      // 15s timeout for status checks
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        },
        15000
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
    // 10s timeout for cleanup (non-critical operation)
    await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${GEMINI_API_KEY}`,
      { method: 'DELETE' },
      10000
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
 * Generate embedding using Gemini text-embedding-005 model
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-005:embedContent?key=${GEMINI_API_KEY}`,
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
    
    // Reset cache for fresh fetch each invocation
    cachedClientsData = null;
    
    // Fetch clients and categories from database
    const clientsData = await fetchClientsAndCategories(supabase);
    console.log(`[Legacy] Using ${clientsData.clients.length} clients with ${clientsData.allKeywords.length} keywords`);
    
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
    
    console.log(`✓ Job ${jobId} started, returning to client while processing continues in background...`);
    
    // Start background processing (fire-and-forget pattern)
    const processingPromise = (async () => {
      try {
        // Download the file from storage (use compressed if available)
        let fileData;
        try {
          const filePathToDownload = job.compressed_file_path || job.file_path;
          console.log(`Downloading PDF: ${filePathToDownload}${job.compressed_file_path ? ' (compressed)' : ' (original)'}`);
          
          fileData = await downloadFileFromStorage(supabase, filePathToDownload);
          console.log(`Successfully downloaded file with size: ${fileData.byteLength} bytes`);
        } catch (error) {
          console.error("Error downloading file:", error);
          await updateProcessingJob(supabase, jobId, { 
            status: 'error',
            error: 'Failed to download file'
          });
          return;
        }
        
        // Detect file type (use original file_path for extension detection)
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
              1,
              clientsData
            );
            
            if (allClippings.length === 0) {
              await updateProcessingJob(supabase, jobId, {
                status: 'completed',
                progress: 100,
                error: 'No se encontraron recortes en la imagen'
              });
              return;
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
            const shouldUseBatchProcessing = fileSizeMB > 10 || estimatedPages > 10;
            
            if (shouldUseBatchProcessing) {
              console.log(`Multi-page PDF detected (est. ${estimatedPages} pages), using batch processing to analyze ALL pages...`);
              const result = await processLargePDFInChunks(
                pdfBlob,
                job.file_path,
                supabase,
                jobId,
                clientsData
              );
              allClippings = result.clippings;
              
              // Store retry stats for document summary
              (allClippings as any).retryStats = result.retryStats;
            } else {
              console.log('Processing small single-page PDF directly...');
              allClippings = await processImageWithGeminiVision(
                pdfBlob,
                job.file_path,
                1,
                clientsData
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
          
          await updateProcessingJob(supabase, jobId, {
            status: 'error',
            error: `Error procesando archivo: ${errorMsg}`,
            progress: 60
          });
          return;
        }
        
        // Handle case where no clippings were found
        if (allClippings.length === 0) {
          console.warn("No clippings found");
          await updateProcessingJob(supabase, jobId, {
            status: 'completed',
            progress: 100,
            error: 'No se encontraron recortes'
          });
          return;
        }
        
        // Generate document-level summary with retry statistics
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
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
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
            
            // Add retry statistics if available
            const retryStats = (allClippings as any).retryStats;
            if (retryStats && retryStats.failedInitial > 0) {
              documentSummary += `\n\n📊 Estadísticas de reintentos:\n- Páginas con errores iniciales: ${retryStats.failedInitial}\n- Páginas recuperadas: ${retryStats.recovered}\n- Tasa de éxito final: ${retryStats.finalSuccessRate.toFixed(1)}%`;
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
        
        console.log(`✓ Background processing complete: ${processedClippings.length} clippings saved`);
        
      } catch (backgroundError) {
        console.error("Background processing error:", backgroundError);
        await updateProcessingJob(supabase, jobId, {
          status: 'error',
          error: backgroundError instanceof Error ? backgroundError.message : String(backgroundError),
          progress: 0
        });
      }
    })();
    
    // Use EdgeRuntime.waitUntil to keep processing alive after returning response
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processingPromise);
    } else {
      // Fallback for local testing - don't await
      processingPromise.catch(err => console.error("Processing promise error:", err));
    }
    
    // Return immediately to client (202 Accepted - processing continues in background)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Processing started',
        jobId,
        status: 'processing'
      }),
      { 
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
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
