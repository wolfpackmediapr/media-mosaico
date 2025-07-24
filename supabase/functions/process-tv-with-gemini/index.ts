
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3';
import { updateTranscriptionRecord } from './database-utils.ts';
import { parseAnalysisText } from './analysis-parser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive TV Analysis Prompt (the detailed one you had)
function buildComprehensiveTvAnalysisPrompt(categories: string[], clients: Array<{name: string, keywords: string[]}>) {
  const categoriesList = categories.length > 0 ? categories.join(', ') : 'Política, Economía, Deportes, Entretenimiento, Salud, Educación, Crimen, Ambiente, Tecnología, Gobierno, Religión, Comunidad';
  
  const clientsList = clients.map(client => client.name).join(', ');
  
  const clientKeywordMapping = clients.map(client => 
    `**${client.name}:** ${client.keywords.join(', ')}`
  ).join('\n');

  return `Eres un analista experto en contenido de TV. Tu tarea es analizar la siguiente transcripción de TV en español e identificar y separar el contenido publicitario del contenido regular del programa.

IMPORTANTE - FORMATO DE RESPUESTA:
Debes identificar y separar claramente cada sección de contenido, comenzando CADA SECCIÓN con uno de estos encabezados:

[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]
o
[TIPO DE CONTENIDO: PROGRAMA REGULAR]

IDENTIFICACIÓN DE ANUNCIOS:
Señales clave para identificar anuncios:
- Menciones de precios, ofertas o descuentos
- Llamadas a la acción ("llame ahora", "visite nuestra tienda", etc.)
- Información de contacto (números de teléfono, direcciones)
- Menciones repetidas de marcas o productos específicos
- Lenguaje persuasivo o promocional

PARA CADA SECCIÓN DE ANUNCIO PUBLICITARIO:
1. Marca(s) o producto(s) anunciados
2. Mensajes clave del anuncio
3. Llamada a la acción (si existe)
4. Tono del anuncio
5. Duración aproximada

PARA CADA SECCIÓN DE PROGRAMA REGULAR:
1. Resumen del contenido (70-100 oraciones)
   - Incluir desarrollo cronológico de los temas
   - Destacar citas textuales relevantes
   - Mencionar interacciones entre participantes si las hay
   - Identificación de los participantes en la conversación (cuántos hablantes participan y si se pueden identificar sus roles o nombres) [utilizar los nombres específicos de los hablantes cuando estén disponibles]

2. Temas principales tratados
   - Listar temas por orden de importancia
   - Incluir subtemas relacionados
   - Señalar conexiones entre temas si existen

3. Tono del contenido
   - Estilo de la presentación (formal/informal)
   - Tipo de lenguaje utilizado
   - Enfoque del contenido (informativo/editorial/debate)

4. Categorías aplicables de: ${categoriesList}
   - Justificar la selección de cada categoría
   - Indicar categoría principal y secundarias

5. Presencia de personas o entidades relevantes mencionadas

6. Clientes relevantes que podrían estar interesados en este contenido. Lista de clientes disponibles: ${clientsList}

7. Palabras clave mencionadas relevantes para los clientes. Lista de correlación entre clientes y palabras clave:
${clientKeywordMapping}

Responde en español de manera concisa y profesional. Asegúrate de:
1. Comenzar SIEMPRE con el encabezado de tipo de contenido correspondiente en mayúsculas
2. Si es un anuncio, enfatizar las marcas, productos y llamadas a la acción
3. Si es contenido regular, mantener el formato de análisis detallado
4. Incluir las palabras textuales que justifiquen las asociaciones con clientes o palabras clave
5. Utilizar los nombres específicos de los hablantes cuando estén disponibles en lugar de referencias genéricas como "SPEAKER A" o "SPEAKER B"

IMPORTANTE - MANEJO DE HABLANTES:
La transcripción incluye nombres específicos de hablantes (pueden ser nombres propios como "María", "Juan", etc., en lugar de etiquetas genéricas). Utiliza estos nombres específicos en tu análisis para:
- Identificar diferentes personas y sus roles
- Describir la dinámica de la conversación
- Mencionar contribuciones específicas de cada participante
- Proporcionar un análisis más personalizado y profesional

Evita usar referencias genéricas como "hablante 1", "participante A", etc., cuando tengas nombres específicos disponibles.`;
}

// Enhanced segment extraction that consolidates program content
function extractSegmentsFromAnalysis(analysisText: string): Array<{
  headline: string;
  text: string;
  start: number;
  end: number;
  keywords?: string[];
}> {
  if (!analysisText) return [];

  const segments: Array<{
    headline: string;
    text: string;
    start: number;
    end: number;
    keywords?: string[];
  }> = [];

  // Split by content type markers
  const contentSections = analysisText.split(/(\[TIPO DE CONTENIDO: [^\]]+\])/);
  
  let programContent = "";
  let currentType = "";
  let segmentCounter = 0;

  for (let i = 0; i < contentSections.length; i++) {
    const section = contentSections[i].trim();
    
    if (section.startsWith("[TIPO DE CONTENIDO:")) {
      currentType = section;
    } else if (section && currentType) {
      if (currentType.includes("ANUNCIO PUBLICITARIO")) {
        // Create separate segments for each advertisement
        segments.push({
          headline: `Anuncio Publicitario ${segmentCounter + 1}`,
          text: section,
          start: segmentCounter * 30,
          end: (segmentCounter + 1) * 30,
          keywords: ["anuncio", "publicitario", "comercial"]
        });
        segmentCounter++;
      } else if (currentType.includes("PROGRAMA REGULAR")) {
        // Consolidate all program content into one segment
        programContent += section + "\n\n";
      }
      currentType = "";
    }
  }

  // Add consolidated program content as the first segment
  if (programContent.trim()) {
    segments.unshift({
      headline: "Contenido del Programa",
      text: programContent.trim(),
      start: 0,
      end: 3600, // 1 hour default
      keywords: ["programa", "contenido", "regular"]
    });
  }

  return segments;
}

// Enhanced utterance processing with better speaker identification
function processUtterancesWithSpeakerNames(transcriptionText: string): Array<{
  start: number;
  end: number;
  text: string;
  speaker: string;
  confidence: number;
}> {
  if (!transcriptionText) return [];

  const utterances: Array<{
    start: number;
    end: number;
    text: string;
    speaker: string;
    confidence: number;
  }> = [];

  // Split by speaker patterns and extract names
  const lines = transcriptionText.split('\n');
  let currentTime = 0;
  const timeIncrement = 5; // 5 seconds per utterance

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Look for speaker patterns like "SPEAKER_NAME:" or "Nombre:"
    const speakerMatch = trimmedLine.match(/^([A-Z][a-zA-Z\s]+):\s*(.+)$/);
    
    if (speakerMatch) {
      const [, speakerName, text] = speakerMatch;
      
      utterances.push({
        start: currentTime,
        end: currentTime + timeIncrement,
        text: text.trim(),
        speaker: speakerName.trim(),
        confidence: 0.95
      });
    } else {
      // No speaker pattern found, use generic speaker
      utterances.push({
        start: currentTime,
        end: currentTime + timeIncrement,
        text: trimmedLine,
        speaker: "SPEAKER_0",
        confidence: 0.8
      });
    }

    currentTime += timeIncrement;
  }

  return utterances;
}

// Enhanced Gemini processing with comprehensive analysis
async function processVideoWithGemini(videoBlob: Blob, fileName: string, categories: string[], clients: Array<{name: string, keywords: string[]}>) {
  console.log('[gemini-unified] Processing video with comprehensive analysis...');
  
  const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_GEMINI_API_KEY')!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    // Upload video to Gemini
    console.log('[gemini-unified] Uploading video to Gemini...', fileName);
    const uploadResult = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'multipart',
        'X-Goog-Upload-Command': 'start,upload,finalize',
        'X-Goog-Upload-Header-Content-Length': videoBlob.size.toString(),
        'X-Goog-Upload-Header-Content-Type': 'video/mp4',
        'Authorization': `Bearer ${Deno.env.get('GOOGLE_GEMINI_API_KEY')}`,
        'Content-Type': 'video/mp4'
      },
      body: videoBlob
    });

    if (!uploadResult.ok) {
      throw new Error(`Upload failed: ${uploadResult.status}`);
    }

    const uploadData = await uploadResult.json();
    console.log('[gemini-unified] Video uploaded successfully:', uploadData.file.name);

    // Wait for processing
    const fileUri = uploadData.file.name;
    console.log('[gemini-unified] Waiting for file processing...', fileUri);
    
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!processingComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileUri}`, {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('GOOGLE_GEMINI_API_KEY')}`
        }
      });
      
      const statusData = await statusResponse.json();
      console.log(`[gemini-unified] File status check ${attempts + 1}:`, statusData.state);
      
      if (statusData.state === 'ACTIVE') {
        processingComplete = true;
      }
      attempts++;
    }

    if (!processingComplete) {
      throw new Error('Video processing timeout');
    }

    console.log('[gemini-unified] File processing completed successfully');

    // Generate comprehensive analysis
    const comprehensivePrompt = buildComprehensiveTvAnalysisPrompt(categories, clients);
    
    console.log('[gemini-unified] Analysis attempt 1/3');
    const analysisResult = await model.generateContent([
      {
        fileData: {
          mimeType: 'video/mp4',
          fileUri: fileUri
        }
      },
      { text: comprehensivePrompt }
    ]);

    const analysisText = analysisResult.response.text();
    console.log('[gemini-unified] Analysis completed successfully');

    // Extract segments with proper consolidation
    const segments = extractSegmentsFromAnalysis(analysisText);
    
    // Generate basic transcription for utterances
    const transcriptionPrompt = `Transcribe this video content in Spanish. Format the output with speaker identification where possible. Use speaker names when identifiable, otherwise use SPEAKER_0, SPEAKER_1, etc. Format each line as "SPEAKER_NAME: text content"`;
    
    const transcriptionResult = await model.generateContent([
      {
        fileData: {
          mimeType: 'video/mp4',
          fileUri: fileUri
        }
      },
      { text: transcriptionPrompt }
    ]);

    const transcriptionText = transcriptionResult.response.text();
    const utterances = processUtterancesWithSpeakerNames(transcriptionText);

    // Clean up file
    console.log('[gemini-unified] Cleaning up Gemini file...', fileUri);
    try {
      await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileUri}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('GOOGLE_GEMINI_API_KEY')}`
        }
      });
      console.log('[gemini-unified] File cleanup completed successfully');
    } catch (cleanupError) {
      console.error('[gemini-unified] File cleanup failed:', cleanupError);
    }

    return {
      success: true,
      transcription: transcriptionText,
      full_analysis: analysisText, // Store the full formatted analysis
      segments: segments,
      utterances: utterances,
      summary: `Análisis completado exitosamente con ${segments.length} segmentos identificados`,
      keywords: ["análisis", "contenido", "tv", "procesamiento"]
    };

  } catch (error) {
    console.error('[gemini-unified] Error in video processing:', error);
    throw error;
  }
}

// Main handler function
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] === UNIFIED PROCESSING START ===`);

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

    console.log(`[process-tv-with-gemini] Environment validation:`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      hasGeminiApiKey: !!geminiApiKey,
      supabaseUrlLength: supabaseUrl?.length || 0,
      geminiKeyLength: geminiApiKey?.length || 0
    });

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Missing required environment variables');
    }

    console.log(`[${requestId}] Environment validated successfully`);

    // Parse request
    const { videoPath, transcriptionId } = await req.json();
    
    console.log(`[${requestId}] Request details:`, {
      videoPath,
      transcriptionId,
      hasVideoPath: !!videoPath,
      hasTranscriptionId: !!transcriptionId,
      videoPathLength: videoPath?.length || 0
    });

    if (!videoPath) {
      throw new Error('Video path is required');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (userError) {
        console.error(`[${requestId}] Auth error:`, userError);
      } else {
        console.log(`[${requestId}] Authenticated user:`, user?.id);
      }
    }

    // Fetch categories and clients for dynamic prompt
    console.log(`[${requestId}] Fetching categories and clients for dynamic prompt...`);
    
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('name_es as name');
    
    if (categoriesError) {
      console.error(`[${requestId}] Categories error:`, categoriesError);
    }
    
    console.log(`[${requestId}] Fetched ${categories?.length || 0} categories`);

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('name, keywords');
    
    if (clientsError) {
      console.error(`[${requestId}] Clients error:`, clientsError);
    }
    
    console.log(`[${requestId}] Fetched ${clients?.length || 0} clients`);

    // Process video
    console.log(`[${requestId}] Processing assembled video file from video bucket...`);
    
    const categoriesArray = categories?.map(c => c.name) || [];
    const clientsArray = clients?.map(c => ({ name: c.name, keywords: c.keywords || [] })) || [];

    console.log('[gemini-unified] Processing assembled video...', {
      videoPath,
      categoriesCount: categoriesArray.length,
      clientsCount: clientsArray.length
    });

    // Download video from storage
    console.log('[gemini-unified] Downloading video from Supabase storage...', videoPath);
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('video')
      .createSignedUrl(videoPath, 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${signedUrlError?.message}`);
    }

    const videoResponse = await fetch(signedUrlData.signedUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    console.log('[gemini-unified] Video downloaded successfully:', { size: videoBlob.size, type: videoBlob.type });

    // Process with Gemini
    const result = await processVideoWithGemini(videoBlob, videoPath, categoriesArray, clientsArray);

    console.log(`[${requestId}] Processing completed, updating database...`);

    // Update database with comprehensive results
    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        transcription_text: result.transcription,
        full_analysis: result.full_analysis, // Store the formatted analysis
        analysis_content_summary: result.full_analysis, // Backward compatibility
        summary: result.summary,
        keywords: result.keywords,
        status: 'completed',
        progress: 100,
        updated_at: new Date().toISOString()
      });
    }

    console.log(`[${requestId}] === UNIFIED PROCESSING COMPLETED ===`);

    return new Response(JSON.stringify({
      success: true,
      transcription: result.transcription,
      full_analysis: result.full_analysis,
      segments: result.segments,
      utterances: result.utterances,
      summary: result.summary,
      keywords: result.keywords
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${requestId}] Error in unified processing:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
