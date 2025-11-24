import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Predefined categories and clients (same as original)
const PUBLIMEDIA_CATEGORIES = [
  'ACCIDENTES', 'AGENCIAS DE GOBIERNO', 'AMBIENTE', 'CIENCIA & TECNOLOGIA',
  'COMUNIDAD', 'CRIMEN', 'DEPORTES', 'ECONOMIA & NEGOCIOS', 'EDUCACION & CULTURA',
  'EE.UU. & INTERNACIONALES', 'ENTRETENIMIENTO', 'GOBIERNO', 'OTRAS', 'POLITICA',
  'RELIGION', 'SALUD', 'TRIBUNALES'
];

const PUBLIMEDIA_CLIENTS: Record<string, string[]> = {
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

const FILE_SEARCH_STORE_NAME = 'press-clippings-store';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, publicationName, userId } = await req.json();
    
    if (!file || !publicationName || !userId) {
      throw new Error('Missing required parameters');
    }

    console.log(`[FileSearch] Processing: ${publicationName} (${(file.data.length / 1024 / 1024).toFixed(2)} MB base64)`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Get or create File Search Store
    const fileSearchStoreId = await getOrCreateFileSearchStore();
    console.log(`[FileSearch] Using store: ${fileSearchStoreId}`);

    // Step 2: Decode base64 file data efficiently
    console.log('[FileSearch] Decoding file data...');
    const fileBuffer = Uint8Array.from(atob(file.data), c => c.charCodeAt(0));
    const fileBlob = new Blob([fileBuffer], { type: file.mimeType });
    console.log(`[FileSearch] File size: ${(fileBlob.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Clear the large base64 string from memory
    file.data = null;

    // Step 3: Upload to File Search Store with metadata
    console.log('[FileSearch] Uploading to File Search Store...');
    const uploadResult = await uploadToFileSearchStore(
      fileSearchStoreId,
      fileBlob,
      file.name,
      {
        publication_name: publicationName,
        publication_date: new Date().toISOString(),
        user_id: userId,
        categories: PUBLIMEDIA_CATEGORIES.join(','),
        clients: Object.keys(PUBLIMEDIA_CLIENTS).join(',')
      }
    );

    console.log('[FileSearch] ✓ Upload complete');

    // Step 4: Wait for indexing
    console.log('[FileSearch] Waiting for indexing...');
    await waitForFileIndexing(uploadResult.operationName);

    // Step 5: Analyze document
    console.log('[FileSearch] Analyzing document...');
    const analysisResult = await analyzeDocumentWithFileSearch(
      fileSearchStoreId,
      publicationName
    );

    // Step 6: Store metadata in database
    console.log('[FileSearch] Storing metadata...');
    const { data: doc, error: dbError } = await supabase
      .from('press_file_search_documents')
      .insert({
        user_id: userId,
        publication_name: publicationName,
        file_search_store_id: fileSearchStoreId,
        file_search_document_id: uploadResult.documentId,
        original_filename: file.name,
        file_size_bytes: fileBlob.size,
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
  
  const initResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/${storeId}:uploadToFileSearchStore?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': fileBlob.size.toString(),
        'X-Goog-Upload-Header-Content-Type': fileBlob.type,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        display_name: fileName,
        custom_metadata: Object.entries(metadata).map(([key, value]) => ({
          key,
          string_value: value
        })),
        chunking_config: {
          white_space_config: {
            max_tokens_per_chunk: 800,
            max_overlap_tokens: 100
          }
        }
      })
    }
  );

  if (!initResponse.ok) {
    throw new Error(`Failed to initialize upload: ${initResponse.status}`);
  }

  const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('No upload URL received');

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
    throw new Error(`Upload failed: ${uploadResponse.status}`);
  }

  const result = await uploadResponse.json();
  
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
  publicationName: string
): Promise<{
  summary: string;
  clippingsCount: number;
  categories: string[];
  keywords: string[];
  relevantClients: string[];
}> {
  
  const analysisPrompt = `Analiza este documento de prensa de "${publicationName}".

**FILTRO ESTRICTO**: Solo incluye artículos que mencionan EXACTAMENTE estos clientes o sus sectores:
${Object.entries(PUBLIMEDIA_CLIENTS).map(([sector, clients]) => 
  `${sector}: ${clients.join(', ')}`
).join('\n')}

**CATEGORÍAS VÁLIDAS**: ${PUBLIMEDIA_CATEGORIES.join(', ')}

Proporciona:
1. **Resumen ejecutivo** (2-3 oraciones del documento completo)
2. **Cantidad de artículos relevantes** encontrados
3. **Categorías presentes** (lista de categorías encontradas)
4. **Palabras clave principales** (máximo 10 keywords más importantes)
5. **Clientes relevantes** (lista de clientes mencionados)

Responde ÚNICAMENTE en formato JSON estructurado:
{
  "summary": "Resumen ejecutivo...",
  "clippings_count": 5,
  "categories": ["SALUD", "ECONOMIA & NEGOCIOS"],
  "keywords": ["hospital", "presupuesto", "medicaid"],
  "relevant_clients": ["MMM", "Auxilio Mutuo"]
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
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('No analysis content received');
  }

  const parsed = JSON.parse(content);
  
  return {
    summary: parsed.summary || `Documento de ${publicationName}`,
    clippingsCount: parsed.clippings_count || 0,
    categories: parsed.categories || [],
    keywords: parsed.keywords || [],
    relevantClients: parsed.relevant_clients || []
  };
}
