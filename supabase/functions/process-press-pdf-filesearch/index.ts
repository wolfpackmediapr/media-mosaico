import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Default categories (fallback if database fetch fails)
const DEFAULT_CATEGORIES = [
  'ACCIDENTES', 'AGENCIAS DE GOBIERNO', 'AMBIENTE', 'AMBIENTE & EL TIEMPO', 'CIENCIA & TECNOLOGIA',
  'COMUNIDAD', 'CRIMEN', 'DEPORTES', 'ECONOMIA & NEGOCIOS', 'EDUCACION & CULTURA',
  'EE.UU. & INTERNACIONALES', 'ENTRETENIMIENTO', 'GOBIERNO', 'OTRAS', 'POLITICA',
  'RELIGION', 'SALUD', 'TRIBUNALES'
];

const FILE_SEARCH_STORE_NAME = 'press-clippings-store';

// Types for dynamic client data
interface ClientData {
  name: string;
  category: string;
  keywords: string[];
}

/**
 * Fetches clients and categories from the database
 */
async function fetchClientsAndCategories(supabase: any): Promise<{
  clients: ClientData[];
  categories: string[];
  clientsByCategory: Record<string, ClientData[]>;
}> {
  try {
    console.log('[FileSearch] Fetching clients and categories from database...');
    
    // Fetch clients with keywords
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('name, category, keywords');
    
    if (clientsError) {
      console.error('[FileSearch] Error fetching clients:', clientsError);
      throw clientsError;
    }
    
    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('name_es');
    
    if (categoriesError) {
      console.error('[FileSearch] Error fetching categories:', categoriesError);
    }
    
    // Group clients by category
    const clientsByCategory: Record<string, ClientData[]> = {};
    const clientList: ClientData[] = (clients || []).map((c: any) => ({
      name: c.name,
      category: c.category,
      keywords: c.keywords || []
    }));
    
    for (const client of clientList) {
      if (!clientsByCategory[client.category]) {
        clientsByCategory[client.category] = [];
      }
      clientsByCategory[client.category].push(client);
    }
    
    const categoryList = categories?.map((c: any) => c.name_es) || DEFAULT_CATEGORIES;
    
    console.log(`[FileSearch] Loaded ${clientList.length} clients in ${Object.keys(clientsByCategory).length} categories`);
    
    return {
      clients: clientList,
      categories: categoryList,
      clientsByCategory
    };
  } catch (error) {
    console.error('[FileSearch] Failed to fetch from database, using defaults:', error);
    return {
      clients: [],
      categories: DEFAULT_CATEGORIES,
      clientsByCategory: {}
    };
  }
}

/**
 * Builds a prompt section with clients and their keywords for AI analysis
 */
function buildClientKeywordsPrompt(clientsByCategory: Record<string, ClientData[]>): string {
  if (Object.keys(clientsByCategory).length === 0) {
    return 'No hay clientes configurados. Cuenta TODOS los artículos de prensa encontrados.';
  }
  
  const lines: string[] = [];
  for (const [category, clients] of Object.entries(clientsByCategory)) {
    lines.push(`\n${category}:`);
    for (const client of clients) {
      const keywords = client.keywords.length > 0 
        ? client.keywords.join(', ')
        : client.name;
      lines.push(`  - ${client.name} (palabras clave: ${keywords})`);
    }
  }
  return lines.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storagePath, publicationName, userId, fileName, fileSize } = await req.json();
    
    if (!storagePath || !publicationName || !userId) {
      throw new Error('Missing required parameters');
    }

    console.log(`[FileSearch] Processing: ${publicationName} from storage: ${storagePath}`);
    
    // Detect file type
    const fileExtension = fileName.toLowerCase().split('.').pop();
    const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension || '');
    const isPDF = fileExtension === 'pdf';
    
    if (!isImage && !isPDF) {
      throw new Error(`Unsupported file type: ${fileExtension}. Only PDF and image files (JPG, PNG) are supported.`);
    }
    
    console.log(`[FileSearch] File type: ${isImage ? 'Image' : 'PDF'}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch clients and categories from database
    const { clients, categories, clientsByCategory } = await fetchClientsAndCategories(supabase);
    const clientKeywordsPrompt = buildClientKeywordsPrompt(clientsByCategory);

    // Step 1: Download file from Supabase Storage
    console.log('[FileSearch] Downloading from storage...');
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('pdf_uploads')
      .download(storagePath);
    
    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }
    
    console.log(`[FileSearch] Downloaded file: ${(fileData.size / 1024 / 1024).toFixed(2)} MB`);

    let analysisResult;
    let fileSearchStoreId = 'direct-vision'; // Placeholder for images
    let documentId = storagePath;

    if (isImage) {
      // For images: Use Gemini Vision API directly
      console.log('[FileSearch] Processing image with Vision API...');
      analysisResult = await analyzeImageWithVision(fileData, publicationName, clientKeywordsPrompt, categories, clients);
    } else {
      // For PDFs: Use File Search Store
      fileSearchStoreId = await getOrCreateFileSearchStore();
      console.log(`[FileSearch] Using store: ${fileSearchStoreId}`);

      console.log('[FileSearch] Uploading to File Search Store...');
      const uploadResult = await uploadToFileSearchStore(
        fileSearchStoreId,
        fileData,
        fileName,
        {
          publication_name: publicationName,
          publication_date: new Date().toISOString(),
          user_id: userId,
          categories: categories.join(','),
          clients: clients.map(c => c.name).join(',')
        }
      );

      console.log('[FileSearch] ✓ Upload complete');
      documentId = uploadResult.documentId;
      console.log('[FileSearch] Waiting for indexing...');
      await waitForFileIndexing(uploadResult.operationName);

      console.log('[FileSearch] Analyzing document...');
      analysisResult = await analyzeDocumentWithFileSearch(
        fileSearchStoreId,
        publicationName,
        clientKeywordsPrompt,
        categories,
        clients
      );
    }

    // Step 2: Store metadata in database
    console.log('[FileSearch] Storing metadata...');
    const { data: doc, error: dbError } = await supabase
      .from('press_file_search_documents')
      .insert({
        user_id: userId,
        publication_name: publicationName,
        file_search_store_id: fileSearchStoreId,
        file_search_document_id: documentId,
        original_filename: fileName,
        file_size_bytes: fileSize,
        status: 'active',
        document_summary: analysisResult.summary,
        total_clippings_found: analysisResult.clippingsCount,
        categories: analysisResult.categories,
        keywords: analysisResult.keywords,
        relevant_clients: analysisResult.relevantClients
      })
      .select()
      .single();

    if (dbError) throw dbError;

    console.log('[FileSearch] ✓ Processing complete');

    return new Response(
      JSON.stringify({
        success: true,
        documentId: doc.id,
        fileSearchStoreId,
        summary: analysisResult.summary,
        clippingsCount: analysisResult.clippingsCount,
        categories: analysisResult.categories,
        keywords: analysisResult.keywords,
        relevantClients: analysisResult.relevantClients
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[FileSearch] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getOrCreateFileSearchStore(): Promise<string> {
  try {
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${GEMINI_API_KEY}`,
      { method: 'GET' }
    );

    if (listResponse.ok) {
      const stores = await listResponse.json();
      const existingStore = stores.fileSearchStores?.find(
        (s: any) => s.displayName === FILE_SEARCH_STORE_NAME
      );
      
      if (existingStore) {
        console.log('[FileSearch] Using existing store:', existingStore.name);
        return existingStore.name;
      }
    }

    console.log('[FileSearch] Creating new File Search Store...');
    const createResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: FILE_SEARCH_STORE_NAME
        })
      }
    );

    if (!createResponse.ok) {
      throw new Error(`Failed to create File Search Store: ${createResponse.status}`);
    }

    const store = await createResponse.json();
    console.log('[FileSearch] ✓ Store created:', store.name);
    return store.name;
    
  } catch (error) {
    console.error('[FileSearch] Store error:', error);
    throw error;
  }
}

async function uploadToFileSearchStore(
  storeId: string,
  fileBlob: Blob,
  fileName: string,
  metadata: Record<string, string>
): Promise<{ documentId: string; operationName: string }> {
  
  console.log('[FileSearch] Initializing resumable upload...');
  console.log('[FileSearch] File size:', fileBlob.size, 'bytes');
  
  const initResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/${storeId}:uploadToFileSearchStore?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': fileBlob.size.toString(),
        'X-Goog-Upload-Header-Content-Type': 'application/pdf',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        display_name: fileName
      })
    }
  );

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    console.error('[FileSearch] Upload init failed:', initResponse.status, errorText);
    throw new Error(`Failed to initialize upload: ${initResponse.status} - ${errorText}`);
  }

  const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    throw new Error('No upload URL received from Google');
  }
  
  console.log('[FileSearch] Uploading file content...');

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': fileBlob.size.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize'
    },
    body: fileBlob
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('[FileSearch] Upload failed:', uploadResponse.status, errorText);
    throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const result = await uploadResponse.json();
  console.log('[FileSearch] Upload result:', JSON.stringify(result));
  
  return {
    documentId: result.file?.name || result.name,
    operationName: result.name
  };
}

async function waitForFileIndexing(operationName: string): Promise<void> {
  const maxAttempts = 120; // Increased to 10 minutes
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GEMINI_API_KEY}`,
      { method: 'GET' }
    );

    if (statusResponse.ok) {
      const status = await statusResponse.json();
      
      if (status.done === true) {
        console.log(`[FileSearch] ✓ Indexing complete (${attempt} attempts)`);
        return;
      }
      
      if (status.error) {
        throw new Error(`Indexing failed: ${JSON.stringify(status.error)}`);
      }
      
      if (attempt % 10 === 0) {
        console.log(`[FileSearch] Still indexing... (attempt ${attempt}/${maxAttempts})`);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error('Indexing timeout after 10 minutes');
}

async function analyzeDocumentWithFileSearch(
  storeId: string,
  publicationName: string,
  clientKeywordsPrompt: string,
  categories: string[],
  clients: ClientData[]
): Promise<{
  summary: string;
  clippingsCount: number;
  categories: string[];
  keywords: string[];
  relevantClients: string[];
}> {
  
  const hasClients = clients.length > 0;
  const clientNames = clients.map(c => c.name);
  
  const detailedPrompt = `Utiliza la herramienta File Search para leer y analizar el documento de prensa completo de "${publicationName}".

**PASO 1**: Lee el documento completo usando File Search para acceder a su contenido.

**PASO 2**: Genera un ANÁLISIS EXHAUSTIVO Y DETALLADO del documento siguiendo el formato estructurado abajo.

**IMPORTANTE**: 
- Responde ÚNICAMENTE con JSON válido, sin texto adicional antes o después
- El resumen debe ser EXTENSO y DETALLADO (mínimo 500 palabras)
- SIEMPRE menciona números de página específicos para cada sección y artículo
- Incluye TODOS los artículos importantes, no solo los relacionados con clientes

**CATEGORÍAS VÁLIDAS**: ${categories.join(', ')}

${hasClients ? `**CLIENTES Y PALABRAS CLAVE**: Busca artículos que mencionen cualquiera de estas palabras clave o nombres de clientes:
${clientKeywordsPrompt}

Si un artículo menciona CUALQUIERA de estas palabras clave, inclúyelo en el conteo y marca los clientes relevantes.` : `**NOTA**: No hay clientes configurados. Cuenta TODOS los artículos de prensa encontrados en el documento.`}

Proporciona exactamente este formato JSON (sin markdown, sin explicaciones):
{
  "summary": "RESUMEN EJECUTIVO:\\n[Párrafo de 3-4 oraciones describiendo el documento en general, incluyendo nombre de la publicación, fecha si está disponible, y temas principales cubiertos]\\n\\nCONTENIDO POR SECCIONES:\\n• Portada (Pág. 1): [Descripción de los titulares principales y noticias destacadas de la portada]\\n• [Nombre de sección] (Págs. X-Y): [Descripción detallada de los artículos en esta sección, mencionando títulos y temas específicos]\\n• [Nombre de sección] (Págs. X-Y): [Descripción detallada]\\n• [Continuar con todas las secciones identificadas]\\n\\nARTÍCULOS DESTACADOS:\\n1. [Título exacto del artículo] - Pág. X: [Resumen de 2-3 oraciones del contenido del artículo, incluyendo personas mencionadas, instituciones, y datos relevantes]\\n2. [Título exacto del artículo] - Pág. Y: [Resumen detallado]\\n3. [Continuar con los 5-10 artículos más importantes]\\n\\nTEMAS PRINCIPALES IDENTIFICADOS:\\n• [Tema 1]: [Breve explicación de cómo se trata este tema en el documento]\\n• [Tema 2]: [Breve explicación]\\n• [Continuar con 3-5 temas principales]\\n\\nMENCIONES DE ENTIDADES:\\n• Instituciones gubernamentales: [Lista de agencias/instituciones mencionadas con páginas]\\n• Empresas/Organizaciones: [Lista con páginas]\\n• Personas relevantes: [Nombres con cargos y páginas donde aparecen]",
  "clippings_count": 15,
  "categories": ["GOBIERNO", "SALUD", "ECONOMIA & NEGOCIOS"],
  "keywords": ["legislatura", "hospital", "presupuesto", "medicaid", "infraestructura"],
  "relevant_clients": ${hasClients ? '["MMM", "Auxilio Mutuo"]' : '[]'}
}`;

  // Retry prompt: shorter + simpler output to reduce truncation/invalid JSON likelihood
  const simplifiedPrompt = `Utiliza la herramienta File Search para leer y analizar el documento de prensa completo de "${publicationName}".

**IMPORTANTE**:
- Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional
- Mantén el resumen más corto (mínimo 250 palabras)
- Menciona páginas cuando sea posible, pero prioriza JSON válido

**CATEGORÍAS VÁLIDAS**: ${categories.join(', ')}

${hasClients ? `**CLIENTES Y PALABRAS CLAVE**: ${clientKeywordsPrompt}\n\nSi un artículo menciona CUALQUIERA de estas palabras clave, inclúyelo en relevant_clients.` : `**NOTA**: No hay clientes configurados. Cuenta TODOS los artículos de prensa encontrados.`}

Responde exactamente este JSON (sin markdown):
{
  "summary": "RESUMEN EJECUTIVO:\\n[2-3 oraciones]\n\nCONTENIDO POR SECCIONES:\\n• [Sección] (Págs. X-Y): [1-2 oraciones]\n\nARTÍCULOS DESTACADOS:\\n1. [Título] - Pág. X: [1-2 oraciones]\n2. [Título] - Pág. Y: [1-2 oraciones]\n(Máximo 5)\n\nTEMAS PRINCIPALES IDENTIFICADOS:\\n• [Tema 1]\n• [Tema 2]\n• [Tema 3]",
  "clippings_count": 0,
  "categories": [],
  "keywords": [],
  "relevant_clients": ${hasClients ? '[]' : '[]'}
}`;

  const attemptPrompts: Array<{ label: string; prompt: string; maxOutputTokens: number }> = [
    { label: 'detailed', prompt: detailedPrompt, maxOutputTokens: 16384 },
    { label: 'simplified', prompt: simplifiedPrompt, maxOutputTokens: 8192 }
  ];

  let lastCleanContent = '';

  for (let attemptIndex = 0; attemptIndex < attemptPrompts.length; attemptIndex++) {
    const attempt = attemptPrompts[attemptIndex];
    console.log(`[FileSearch] Analyzing with prompt: ${attempt.label} (attempt ${attemptIndex + 1}/${attemptPrompts.length})`);

    const data = await callGeminiFileSearch(storeId, attempt.prompt, attempt.maxOutputTokens);

    // Log full response structure for debugging
    console.log('[FileSearch] Full API response structure:', JSON.stringify(data, null, 2).substring(0, 500));

    const content = extractTextFromGeminiResponse(data);
    if (!content) {
      console.warn('[FileSearch] No content received, trying next attempt');
      continue;
    }

    console.log('[FileSearch] Raw API response:', content.substring(0, 300));

    const cleanContent = cleanGeminiTextToJson(content);
    lastCleanContent = cleanContent;
    console.log('[FileSearch] Cleaned content starts with:', cleanContent.substring(0, 100));

    // Try to parse as JSON
    try {
      const parsed = safeParsePossiblyEmbeddedJson(cleanContent);
      console.log('[FileSearch] ✓ Parsed JSON successfully');

      return {
        summary: parsed.summary || `Documento de ${publicationName}`,
        clippingsCount: parsed.clippings_count || 0,
        categories: parsed.categories || [],
        keywords: parsed.keywords || [],
        relevantClients: parsed.relevant_clients || []
      };
    } catch (parseErr) {
      console.warn('[FileSearch] JSON parse failed:', parseErr);
      // Continue to retry with simplified prompt
    }
  }

  // Final fallback: truncated/invalid JSON. Return partial summary to avoid 500s.
  console.log('[FileSearch] Using final fallback after parse retries');
  const partialSummary = lastCleanContent.match(/"summary"\s*:\s*"([\s\S]*?)"\s*(,|\n|$)/)?.[1]
    || `Documento de prensa: ${publicationName}`;

  return {
    summary: partialSummary.replace(/\\n/g, '\n'),
    clippingsCount: 0,
    categories: [],
    keywords: [],
    relevantClients: []
  };
}

async function callGeminiFileSearch(storeId: string, prompt: string, maxOutputTokens: number): Promise<any> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ file_search: { file_search_store_names: [storeId] } }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

function extractTextFromGeminiResponse(data: any): string | null {
  let content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content && data.candidates?.[0]?.content?.parts) {
    const parts = data.candidates[0].content.parts;
    for (const part of parts) {
      if (part.text) {
        content = part.text;
        break;
      }
    }
  }

  return typeof content === 'string' ? content : null;
}

function cleanGeminiTextToJson(content: string): string {
  let cleanContent = content.trim();

  // Remove opening ```json or ``` marker
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.substring(7).trim();
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.substring(3).trim();
  }

  // Remove closing ``` marker
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.substring(0, cleanContent.length - 3).trim();
  }

  return cleanContent;
}

function safeParsePossiblyEmbeddedJson(cleanContent: string): any {
  // 1) Try direct JSON
  try {
    return JSON.parse(cleanContent);
  } catch {
    // continue
  }

  // 2) Try to extract first balanced JSON object (handles extra text before/after)
  const extracted = extractFirstBalancedJsonObject(cleanContent);
  if (!extracted) {
    throw new Error('No JSON object found');
  }

  return JSON.parse(extracted);
}

function extractFirstBalancedJsonObject(input: string): string | null {
  const start = input.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') depth--;

    if (depth === 0) {
      return input.slice(start, i + 1);
    }
  }

  return null;
}

async function analyzeImageWithVision(
  imageBlob: Blob,
  publicationName: string,
  clientKeywordsPrompt: string,
  categories: string[],
  clients: ClientData[]
): Promise<{
  summary: string;
  clippingsCount: number;
  categories: string[];
  keywords: string[];
  relevantClients: string[];
}> {
  
  console.log('[Vision] Converting image to base64...');
  const arrayBuffer = await imageBlob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  const hasClients = clients.length > 0;
  
  const analysisPrompt = `Analiza esta imagen de un documento de prensa de "${publicationName}".

**IMPORTANTE**: 
- Responde ÚNICAMENTE con JSON válido, sin texto adicional antes o después
- El resumen debe ser DETALLADO (mínimo 200 palabras para imágenes)
- Incluye TODOS los artículos visibles en la imagen

**CATEGORÍAS VÁLIDAS**: ${categories.join(', ')}

${hasClients ? `**CLIENTES Y PALABRAS CLAVE**: Busca artículos que mencionen cualquiera de estas palabras clave:
${clientKeywordsPrompt}` : `**NOTA**: No hay clientes configurados. Cuenta TODOS los artículos de prensa visibles.`}

Extrae y analiza el texto visible. Proporciona exactamente este formato JSON:
{
  "summary": "RESUMEN EJECUTIVO:\\n[Párrafo describiendo el contenido general de la página, incluyendo titulares principales]\\n\\nCONTENIDO VISIBLE:\\n• [Descripción del artículo principal con título y resumen]\\n• [Descripción de otros artículos visibles]\\n\\nARTÍCULOS IDENTIFICADOS:\\n1. [Título del artículo]: [Resumen breve del contenido]\\n2. [Continuar con otros artículos]\\n\\nENTIDADES MENCIONADAS:\\n• [Lista de personas, instituciones y organizaciones visibles en el documento]",
  "clippings_count": 5,
  "categories": ["SALUD", "ECONOMIA & NEGOCIOS"],
  "keywords": ["hospital", "presupuesto", "medicaid"],
  "relevant_clients": ${hasClients ? '["MMM", "Auxilio Mutuo"]' : '[]'}
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: analysisPrompt },
            {
              inline_data: {
                mime_type: imageBlob.type || 'image/jpeg',
                data: base64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 16384
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Vision] Analysis failed:', response.status, errorText);
    throw new Error(`Vision analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('No analysis content received from Vision API');
  }

  console.log('[Vision] Raw API response:', content.substring(0, 300));

  // Clean up the content - remove markdown code blocks
  let cleanContent = content.trim();
  
  // Remove opening ```json or ``` marker
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.substring(7).trim();
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.substring(3).trim();
  }
  
  // Remove closing ``` marker
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.substring(0, cleanContent.length - 3).trim();
  }

  // Parse JSON response
  let parsed: any;
  try {
    parsed = JSON.parse(cleanContent);
    console.log('[Vision] Successfully parsed JSON directly');
  } catch (e) {
    console.log('[Vision] Direct JSON parse failed, trying to extract JSON object');
    
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        console.log('[Vision] Successfully extracted JSON from content');
      } catch (e2) {
        console.error('[Vision] Failed to parse extracted JSON:', e2);
        throw new Error(`Failed to parse Vision API response as JSON. Content starts with: ${cleanContent.substring(0, 150)}`);
      }
    } else {
      throw new Error(`No JSON found in Vision API response. Content starts with: ${cleanContent.substring(0, 150)}`);
    }
  }
  
  return {
    summary: parsed.summary || `Imagen de ${publicationName}`,
    clippingsCount: parsed.clippings_count || 0,
    categories: parsed.categories || [],
    keywords: parsed.keywords || [],
    relevantClients: parsed.relevant_clients || []
  };
}
