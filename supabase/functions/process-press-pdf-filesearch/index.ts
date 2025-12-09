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
  
  const analysisPrompt = `Utiliza la herramienta File Search para leer y analizar el documento de prensa completo de "${publicationName}".

**PASO 1**: Lee el documento completo usando File Search para acceder a su contenido.

**PASO 2**: Analiza el contenido y genera un resumen ejecutivo del documento.

**IMPORTANTE**: Responde ÚNICAMENTE con JSON válido, sin texto adicional antes o después. No incluyas explicaciones, preámbulos ni comentarios.

**CATEGORÍAS VÁLIDAS**: ${categories.join(', ')}

${hasClients ? `**CLIENTES Y PALABRAS CLAVE**: Busca artículos que mencionen cualquiera de estas palabras clave o nombres de clientes:
${clientKeywordsPrompt}

Si un artículo menciona CUALQUIERA de estas palabras clave, inclúyelo en el conteo y marca los clientes relevantes.` : `**NOTA**: No hay clientes configurados. Cuenta TODOS los artículos de prensa encontrados en el documento.`}

Proporciona exactamente este formato JSON (sin markdown, sin explicaciones):
{
  "summary": "Resumen ejecutivo en 2-3 oraciones del documento completo",
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
          parts: [{ text: analysisPrompt }]
        }],
        tools: [{
          file_search: {
            file_search_store_names: [storeId]
          }
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 8192
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Log full response structure for debugging
  console.log('[FileSearch] Full API response structure:', JSON.stringify(data, null, 2).substring(0, 500));
  
  // Try to extract content from different possible locations in the response
  let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  // Check if there's grounding metadata or alternative response structure
  if (!content && data.candidates?.[0]?.content?.parts) {
    // Sometimes with File Search, the response might be in a different part
    const parts = data.candidates[0].content.parts;
    console.log('[FileSearch] Checking alternative parts structure:', JSON.stringify(parts));
    
    // Look for text in any part
    for (const part of parts) {
      if (part.text) {
        content = part.text;
        break;
      }
    }
  }
  
  if (!content) {
    console.error('[FileSearch] No content found in any part. Full response:', JSON.stringify(data));
    console.error('[FileSearch] Candidates structure:', JSON.stringify(data.candidates));
    
    // Check if there's a finish reason that explains why no content
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason) {
      throw new Error(`No content generated. Finish reason: ${finishReason}`);
    }
    
    throw new Error(`No analysis content received. API returned: ${JSON.stringify(data).substring(0, 300)}`);
  }

  console.log('[FileSearch] Raw API response:', content.substring(0, 200));

  // Try to parse as JSON, handling both direct JSON and markdown-wrapped JSON
  let parsed: any;
  try {
    // First try direct JSON parse
    parsed = JSON.parse(content);
  } catch (e) {
    console.log('[FileSearch] Direct JSON parse failed, trying to extract from text');
    
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        console.log('[FileSearch] Successfully extracted JSON from markdown');
      } catch (e2) {
        console.error('[FileSearch] Failed to parse extracted JSON:', e2);
        throw new Error(`Failed to parse API response as JSON. Response starts with: ${content.substring(0, 100)}`);
      }
    } else {
      throw new Error(`No JSON found in API response. Response starts with: ${content.substring(0, 100)}`);
    }
  }
  
  return {
    summary: parsed.summary || `Documento de ${publicationName}`,
    clippingsCount: parsed.clippings_count || 0,
    categories: parsed.categories || [],
    keywords: parsed.keywords || [],
    relevantClients: parsed.relevant_clients || []
  };
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

**IMPORTANTE**: Responde ÚNICAMENTE con JSON válido, sin texto adicional antes o después.

**CATEGORÍAS VÁLIDAS**: ${categories.join(', ')}

${hasClients ? `**CLIENTES Y PALABRAS CLAVE**: Busca artículos que mencionen cualquiera de estas palabras clave:
${clientKeywordsPrompt}` : `**NOTA**: No hay clientes configurados. Cuenta TODOS los artículos de prensa visibles.`}

Extrae y analiza el texto visible. Proporciona exactamente este formato JSON:
{
  "summary": "Resumen ejecutivo en 2-3 oraciones del contenido visible",
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
          maxOutputTokens: 8192
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

  console.log('[Vision] Raw API response:', content.substring(0, 200));

  // Parse JSON response
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.log('[Vision] Direct JSON parse failed, trying to extract from text');
    
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        console.log('[Vision] Successfully extracted JSON from markdown');
      } catch (e2) {
        console.error('[Vision] Failed to parse extracted JSON:', e2);
        throw new Error(`Failed to parse Vision API response as JSON. Response starts with: ${content.substring(0, 100)}`);
      }
    } else {
      throw new Error(`No JSON found in Vision API response. Response starts with: ${content.substring(0, 100)}`);
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
