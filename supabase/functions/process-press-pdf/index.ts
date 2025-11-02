
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

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
- resumen conciso del artículo (máximo 3 oraciones)
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
      "contenido": "resumen conciso del artículo en máximo 3 oraciones",
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
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Processing with Gemini Vision: ${fileName} (${(imageBlob.size / 1024 / 1024).toFixed(2)} MB), page ${pageNumber}, attempt ${attempt}/${maxRetries}`);
      
      // Upload image to Gemini File API
      const fileInfo = await uploadImageToGemini(imageBlob, fileName);
      console.log(`File uploaded successfully: ${fileInfo.uri}`);
      
      // Enhanced prompt for better article detection in complex layouts
      const prompt = `
INSTRUCCIÓN CRÍTICA: Responde ÚNICAMENTE en español con estructura JSON exacta.

Eres un experto analista de prensa escrita de Puerto Rico y el Caribe especializado en OCR y extracción de contenido.

IMPORTANTE: Este puede ser un documento PDF de múltiples páginas o un periódico escaneado con diseño complejo.
Tu tarea es extraer TODOS los artículos de noticias que encuentres, sin importar el diseño o la calidad del escaneo.

Instrucciones detalladas:
1. Usa OCR para extraer TODO el texto visible, incluso si está en columnas múltiples o tiene diseño complejo
2. Identifica los límites de cada artículo individual (título, cuerpo, conclusión)
3. Si encuentras artículos parciales o cortados, extrae el contenido disponible
4. Busca artículos en TODAS las áreas de la página: arriba, abajo, izquierda, derecha, esquinas
5. No ignores artículos pequeños o recuadros de texto
6. Si el texto está borroso o difícil de leer, haz tu mejor esfuerzo con OCR

Categorías disponibles: ${publimediaCategories.join(', ')}

Clientes que monitoreamos: ${Object.entries(publimediaClients)
  .map(([cat, clients]) => `${cat}: ${(clients as string[]).join(', ')}`)
  .join('; ')}

Para CADA artículo que encuentres, extrae:
- Título (puede estar en negrita o tamaño mayor)
- Contenido completo del artículo
- Categoría que mejor describa el tema
- Quién: personas, organizaciones, instituciones mencionadas
- Qué: evento, situación o hecho principal
- Cuándo: fechas, horarios, períodos temporales
- Dónde: lugares, ciudades, regiones
- Por qué: causas, razones, motivaciones
- Palabras clave relevantes (nombres propios, términos técnicos, etc.)
- Clientes que podrían estar interesados en esta noticia

RESPONDE CON ESTA ESTRUCTURA JSON EXACTA (NO agregues texto adicional):
{
  "recortes": [
    {
      "titulo": "título del artículo",
      "contenido": "resumen conciso del artículo en máximo 3 oraciones",
      "categoria": "categoría",
      "quien": "personas/organizaciones mencionadas",
      "que": "descripción del evento principal",
      "cuando": "información temporal",
      "donde": "ubicación geográfica",
      "porque": "causas o razones",
      "palabras_clave": ["palabra1", "palabra2", "palabra3"],
      "relevancia_clientes": ["cliente1", "cliente2"]
    }
  ]
}

Si no encuentras ningún artículo, responde: {"recortes": []}
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
              content: clip.contenido || "",
              category: clip.categoria || "OTRAS",
              summary_who: clip.quien || "",
              summary_what: clip.que || "",
              summary_when: clip.cuando || "",
              summary_where: clip.donde || "",
              summary_why: clip.porque || "",
              keywords: Array.isArray(clip.palabras_clave) ? clip.palabras_clave : [],
              relevant_clients: Array.isArray(clip.relevancia_clientes) ? clip.relevancia_clientes : []
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
      
      return mappedClippings;

    } catch (error) {
      console.error(`Error on attempt ${attempt}/${maxRetries}:`, error);
      
      // If this was the last attempt, return empty array
      if (attempt === maxRetries) {
        console.error(`Failed after ${maxRetries} attempts, returning empty result`);
        return [];
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = 2000 * attempt;
      console.log(`Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return [];
}

/**
 * Extract a specific page from a PDF and return it as a single-page PDF Blob
 */
async function extractPDFPage(pdfBlob: Blob, pageNumber: number): Promise<Blob | null> {
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();
    
    if (pageNumber < 1 || pageNumber > totalPages) {
      console.warn(`Page ${pageNumber} out of range (total: ${totalPages})`);
      return null;
    }
    
    // Create a new PDF with just the requested page
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNumber - 1]);
    newPdf.addPage(copiedPage);
    
    const pdfBytes = await newPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error(`Error extracting page ${pageNumber}:`, error);
    return null;
  }
}

/**
 * Get the actual page count from a PDF
 */
async function getPDFPageCount(pdfBlob: Blob): Promise<number> {
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    // Fallback to estimation
    return Math.ceil(pdfBlob.size / (100 * 1024));
  }
}

/**
 * Process large PDFs by extracting and processing individual pages
 */
async function processLargePDFInChunks(
  pdfBlob: Blob,
  fileName: string,
  supabase: any,
  jobId: string
): Promise<any[]> {
  const fileSizeMB = pdfBlob.size / 1024 / 1024;
  console.log(`Processing large PDF (${fileSizeMB.toFixed(2)} MB) page by page...`);
  
  // Get actual page count from PDF
  const totalPages = await getPDFPageCount(pdfBlob);
  console.log(`PDF has ${totalPages} pages`);
  
  let allClippings: any[] = [];
  
  // Process each page individually
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    console.log(`Processing page ${pageNum}/${totalPages}...`);
    
    // Update progress (10% to 80% range)
    const progress = 10 + Math.floor((pageNum / totalPages) * 70);
    await updateProcessingJob(supabase, jobId, { 
      progress,
      error: null
    });
    
    try {
      // Extract this specific page as a single-page PDF
      const pageBlob = await extractPDFPage(pdfBlob, pageNum);
      
      if (!pageBlob) {
        console.warn(`Skipping page ${pageNum} - extraction failed`);
        continue;
      }
      
      // Process this single page with Gemini Vision
      const pageClippings = await processImageWithGeminiVision(
        pageBlob,
        `${fileName}_page_${pageNum}`,
        pageNum
      );
      
      console.log(`Page ${pageNum} returned ${pageClippings.length} clippings`);
      allClippings.push(...pageClippings);
      
      // Small delay between pages to avoid rate limits
      if (pageNum < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
      // Continue with other pages even if one fails
    }
  }
  
  console.log(`Page-by-page processing complete. Total clippings: ${allClippings.length}`);
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


// Batch processing configuration
const PAGES_PER_BATCH = 8;
const MAX_SYNC_PAGES = 10;
const MAX_SYNC_SIZE_MB = 15;

// Create batch tasks for large PDF processing
async function createBatchTasks(
  supabase: any,
  jobId: string,
  totalPages: number
): Promise<number> {
  const batches = [];
  for (let i = 1; i <= totalPages; i += PAGES_PER_BATCH) {
    const startPage = i;
    const endPage = Math.min(i + PAGES_PER_BATCH - 1, totalPages);
    batches.push({
      job_id: jobId,
      batch_number: Math.floor((i - 1) / PAGES_PER_BATCH) + 1,
      start_page: startPage,
      end_page: endPage,
      status: 'pending'
    });
  }
  
  const { error } = await supabase
    .from('pdf_batch_tasks')
    .insert(batches);
    
  if (error) throw error;
  return batches.length;
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
      // PDF processing with page-by-page extraction
      const fileSizeMB = fileData.byteLength / 1024 / 1024;
      console.log(`Processing PDF (${fileSizeMB.toFixed(2)} MB)`);
      
      // Update progress
      await updateProcessingJob(supabase, jobId, { 
        progress: 10,
        error: null
      });
      
      const pdfBlob = new Blob([fileData], { type: 'application/pdf' });
      
      // Get page count first
      const pageCount = await getPDFPageCount(pdfBlob);
      console.log(`PDF contains ${pageCount} pages`);
      
      // Decide processing strategy based on size/pages
      if (pageCount > MAX_SYNC_PAGES || fileSizeMB > MAX_SYNC_SIZE_MB) {
        // Large PDF: Use batch processing
        console.log(`Large PDF detected (${pageCount} pages, ${fileSizeMB.toFixed(2)}MB). Creating batch tasks...`);
        
        const batchCount = await createBatchTasks(supabase, jobId, pageCount);
        console.log(`Created ${batchCount} batch tasks`);
        
        // Update job status
        await updateProcessingJob(supabase, jobId, { progress: 20 });
        
        // Trigger first batch asynchronously (don't await)
        console.log('Triggering first batch...');
        supabase.functions.invoke('process-pdf-batch', {
          body: { jobId, batchNumber: 1 }
        }).catch(err => console.error('Error triggering first batch:', err));
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `Batch processing started for ${pageCount} pages`,
            batchCount,
            jobId,
            pageCount
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Small PDF: Process synchronously
        console.log('Small PDF, processing synchronously...');
        if (pageCount > 1 || fileSizeMB > 10) {
          allClippings = await processLargePDFInChunks(
            pdfBlob,
            job.file_path,
            supabase,
            jobId
          );
        } else {
          // Single-page PDF
          allClippings = await processImageWithGeminiVision(
            pdfBlob,
            job.file_path,
            1
          );
        }
      }
      
      console.log(`PDF processing returned ${allClippings.length} total clippings`);
      
      // Update progress after processing
      await updateProcessingJob(supabase, jobId, { 
        progress: 80,
        error: null
      });
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
