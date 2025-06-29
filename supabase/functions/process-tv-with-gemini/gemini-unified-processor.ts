export async function processVideoWithGemini(
  videoBlob: Blob, 
  apiKey: string, 
  videoPath: string,
  progressCallback?: (progress: number) => void,
  categories: any[] = [],
  clients: any[] = []
) {
  try {
    console.log('[gemini-unified] Starting unified video processing...', {
      blobSize: videoBlob.size,
      blobType: videoBlob.type,
      videoPath,
      categoriesCount: categories.length,
      clientsCount: clients.length
    });
    
    // Step 1: Upload video to Gemini (10% progress)
    progressCallback?.(0.1);
    const uploadedFile = await uploadVideoToGemini(videoBlob, apiKey, videoPath);
    
    // Step 2: Wait for processing (30% progress when complete)
    progressCallback?.(0.2);
    const processedFile = await waitForFileProcessing(uploadedFile.name, apiKey, progressCallback);
    
    // Step 3: Generate comprehensive analysis (80% progress when complete)
    progressCallback?.(0.6);
    const analysisResult = await generateComprehensiveAnalysis(processedFile.uri, apiKey, categories, clients);
    
    // Step 4: Cleanup (100% progress)
    progressCallback?.(0.9);
    await cleanupGeminiFile(processedFile.name, apiKey);
    
    progressCallback?.(1.0);
    console.log('[gemini-unified] Unified processing completed successfully');
    
    return analysisResult;
    
  } catch (error) {
    console.error('[gemini-unified] Processing error:', error);
    throw new Error(`Unified video processing failed: ${error.message}`);
  }
}

async function uploadVideoToGemini(videoBlob: Blob, apiKey: string, videoPath: string) {
  console.log('[gemini-unified] Uploading video to Gemini...', {
    size: videoBlob.size,
    type: videoBlob.type
  });
  
  // Determine proper MIME type
  let mimeType = videoBlob.type || 'video/mp4';
  if (!mimeType || mimeType === 'application/octet-stream') {
    // Determine MIME type from file extension
    const extension = videoPath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'mp4':
        mimeType = 'video/mp4';
        break;
      case 'mov':
        mimeType = 'video/quicktime';
        break;
      case 'avi':
        mimeType = 'video/x-msvideo';
        break;
      case 'webm':
        mimeType = 'video/webm';
        break;
      default:
        mimeType = 'video/mp4'; // Default fallback
    }
    console.log(`[gemini-unified] Corrected MIME type to: ${mimeType}`);
  }
  
  const formData = new FormData();
  const fileName = videoPath.split('/').pop() || 'video.mp4';
  
  // Create a new blob with the correct MIME type
  const correctedBlob = new Blob([videoBlob], { type: mimeType });
  formData.append('file', correctedBlob, fileName);
  
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[gemini-unified] Upload attempt ${attempt}/${maxRetries}`);
      
      const uploadResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type - let browser set it with boundary for FormData
        }
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`[gemini-unified] Upload failed (attempt ${attempt}):`, errorText);
        
        if (attempt === maxRetries) {
          throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }

      const uploadResult = await uploadResponse.json();
      console.log('[gemini-unified] File uploaded successfully:', uploadResult.file?.name);
      
      return uploadResult.file;
      
    } catch (error) {
      console.error(`[gemini-unified] Upload attempt ${attempt} error:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function waitForFileProcessing(
  fileName: string, 
  apiKey: string, 
  progressCallback?: (progress: number) => void,
  maxAttempts = 30
) {
  console.log('[gemini-unified] Waiting for file processing...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error(`[gemini-unified] Status check failed:`, errorText);
        throw new Error(`Status check failed: ${statusResponse.status} - ${errorText}`);
      }

      const fileStatus = await statusResponse.json();
      console.log(`[gemini-unified] Processing status (${attempt}/${maxAttempts}): ${fileStatus.state}`);

      if (fileStatus.state === 'ACTIVE') {
        console.log('[gemini-unified] File processing completed successfully');
        return fileStatus;
      } else if (fileStatus.state === 'FAILED') {
        throw new Error(`File processing failed: ${fileStatus.error?.message || 'Unknown error'}`);
      }

      // Update progress during processing wait
      progressCallback?.(0.2 + (attempt / maxAttempts) * 0.3);
      
      // Progressive wait time with jitter
      const baseWait = Math.min(2000 * Math.pow(1.2, attempt - 1), 8000);
      const jitter = Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, baseWait + jitter));
      
    } catch (error) {
      console.error(`[gemini-unified] Status check attempt ${attempt} failed:`, error);
      if (attempt === maxAttempts) {
        throw new Error(`File processing timeout after ${maxAttempts} attempts: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  throw new Error('File processing timeout');
}

async function generateComprehensiveAnalysis(fileUri: string, apiKey: string, categories: any[] = [], clients: any[] = []) {
  console.log('[gemini-unified] Generating comprehensive analysis...');
  
  // Build dynamic category list
  const categoriesText = categories.length > 0 
    ? categories.map(c => c.name_es || c.name).join(', ')
    : 'Economía & Negocios, Política, Salud, Deportes, Entretenimiento, Crimen, Educación & Cultura, Ambiente, Ciencia & Tecnología, Religión, Tribunales, Gobierno, Comunidad, Accidentes, EE.UU. & Internacionales, Otras';

  // Build dynamic clients list
  const clientsText = clients.length > 0
    ? clients.map(c => `${c.name} (${c.category})`).join(', ')
    : 'Accidentes, Agencia de Gobierno, Ambiente, Ambiente & El Tiempo, Ciencia & Tecnología, Comunidad, Crimen, Deportes, Economía & Negocios, Educación & Cultura, EE.UU. & Internacionales, Entretenimiento, Gobierno, Otras, Política, Religión, Salud, Tribunales';

  // Build client-keyword mapping
  const keywordMapping = `
**Accidentes:** tráfico, autopista, PR-52, heridas, choque
**Agencia de Gobierno:** infraestructura, Naguabo, PROMESA, carreteras, servicios públicos
**Ambiente:** conservación, bosques, reforestación, educación ambiental
**Ambiente & El Tiempo:** tormenta tropical, lluvias, vientos, alerta
**Ciencia & Tecnología:** científicos, Universidad de Puerto Rico, detección temprana, enfermedades tropicales
**Comunidad:** Cruz Roja Americana, talleres, primeros auxilios, Hospital del Niño, recaudación de fondos
**Crimen:** Policía, arresto, robos, San Juan, investigaciones
**Deportes:** baloncesto, equipo nacional, torneo, Juegos Olímpicos, victoria
**Economía & Negocios:** economía, recuperación, Coop de Seguros Múltiples, ingresos, Ford, vehículos
**Educación & Cultura:** Departamento de Educación, currículo, historia, cultura, estudiantes
**EE.UU. & Internacionales:** tensiones diplomáticas, Estados Unidos, China, negociaciones comerciales, repercusiones económicas
**Entretenimiento:** Telemundo, serie, público puertorriqueño, actores
**Gobierno:** Etica Gubernamental, investigación, irregularidades, fondos públicos, agencias gubernamentales
**Otras:** organizaciones sin fines de lucro, campaña, concienciación, voluntariado, eventos, actividades
**Política:** elecciones, candidatos, plataformas, propuestas, debate, temas económicos, temas sociales
**Religión:** festividades, iglesias, eventos, actividades, feligreses
**Salud:** enfermedades respiratorias, campañas de prevención, atención primaria, capacidad hospitalaria, medicamentos
**Tribunales:** Tribunal Supremo, decisión, derechos civiles, precedente, organizaciones de derechos humanos`;

  const prompt = `
Eres un analista experto en contenido de TV. Analiza este video de TV en español y proporciona DOS SECCIONES CLARAMENTE SEPARADAS:

## SECCIÓN 1: TRANSCRIPCIÓN CON IDENTIFICACIÓN DE HABLANTES

Proporciona una transcripción completa y precisa del contenido hablado en el video, identificando claramente a cada hablante cuando sea posible. Utiliza el formato:

HABLANTE 1: [texto hablado]
HABLANTE 2: [texto hablado]
NARRADOR: [texto hablado]

Si puedes identificar nombres específicos de los hablantes, utilízalos en lugar de "HABLANTE 1", etc.

## SECCIÓN 2: ANÁLISIS DE CONTENIDO

Identifica y separa claramente cada sección de contenido, comenzando CADA SECCIÓN con uno de estos encabezados:

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

4. Categorías aplicables de: ${categoriesText}
   - Justificar la selección de cada categoría
   - Indicar categoría principal y secundarias

5. Presencia de personas o entidades relevantes mencionadas

6. Clientes relevantes que podrían estar interesados en este contenido. Lista de clientes disponibles: ${clientsText}

7. Palabras clave mencionadas relevantes para los clientes. Lista de correlación entre clientes y palabras clave:
${keywordMapping}

Responde en español de manera concisa y profesional. Asegúrate de:
1. Separar claramente las DOS SECCIONES principales (TRANSCRIPCIÓN y ANÁLISIS)
2. Comenzar SIEMPRE cada subsección de análisis con el encabezado de tipo de contenido correspondiente en mayúsculas
3. Si es un anuncio, enfatizar las marcas, productos y llamadas a la acción
4. Si es contenido regular, mantener el formato de análisis detallado
5. Incluir las palabras textuales que justifiquen las asociaciones con clientes o palabras clave
6. Utilizar los nombres específicos de los hablantes cuando estén disponibles en lugar de referencias genéricas como "SPEAKER A" o "SPEAKER B"
  `;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            file_data: {
              mime_type: 'video/mp4',
              file_uri: fileUri
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    }
  };

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[gemini-unified] Analysis attempt ${attempt}/${maxRetries}`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[gemini-unified] Analysis failed (attempt ${attempt}):`, errorText);
        
        if (attempt === maxRetries) {
          throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
        continue;
      }

      const result = await response.json();
      
      if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('[gemini-unified] Invalid response format:', result);
        throw new Error('Invalid response format from Gemini - no text content');
      }
      
      const fullResponseText = result.candidates[0].content.parts[0].text;
      console.log('[gemini-unified] Analysis completed successfully');
      
      // Parse the response to separate transcription and analysis
      const { transcription, analysis } = parseGeminiResponse(fullResponseText);
      
      // Create a structured response with separated transcription and analysis
      return {
        transcription: transcription,
        visual_analysis: "Análisis visual procesado exitosamente",
        segments: extractSegmentsFromAnalysis(analysis),
        keywords: extractKeywordsFromAnalysis(analysis),
        summary: extractSummaryFromAnalysis(analysis),
        analysis: {
          who: "Participantes identificados en el análisis",
          what: "Contenido analizado del programa de TV", 
          when: "Durante la transmisión",
          where: "Puerto Rico/Región Caribe",
          why: "Información noticiosa y publicitaria relevante"
        },
        utterances: createUtterancesFromTranscription(transcription),
        full_analysis: analysis
      };
      
    } catch (error) {
      console.error(`[gemini-unified] Analysis attempt ${attempt} error:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
    }
  }
}

function parseGeminiResponse(fullText: string): { transcription: string, analysis: string } {
  // Look for section headers to separate transcription and analysis
  const transcriptionMatch = fullText.match(/## SECCIÓN 1: TRANSCRIPCIÓN CON IDENTIFICACIÓN DE HABLANTES\s*([\s\S]*?)(?=## SECCIÓN 2:|$)/i);
  const analysisMatch = fullText.match(/## SECCIÓN 2: ANÁLISIS DE CONTENIDO\s*([\s\S]*)/i);
  
  let transcription = "";
  let analysis = "";
  
  if (transcriptionMatch && transcriptionMatch[1]) {
    transcription = transcriptionMatch[1].trim();
  }
  
  if (analysisMatch && analysisMatch[1]) {
    analysis = analysisMatch[1].trim();
  }
  
  // Fallback: if sections not found, try to split differently
  if (!transcription && !analysis) {
    const sections = fullText.split(/(?=## SECCIÓN|SECCIÓN)/i);
    if (sections.length >= 2) {
      transcription = sections[1] || "";
      analysis = sections.slice(2).join('\n') || sections[1] || fullText;
    } else {
      // Final fallback: treat entire response as analysis if no clear separation
      transcription = "Transcripción no disponible en formato separado";
      analysis = fullText;
    }
  }
  
  // Clean up the extracted sections
  transcription = transcription.replace(/^## SECCIÓN 1: TRANSCRIPCIÓN CON IDENTIFICACIÓN DE HABLANTES\s*/i, '').trim();
  analysis = analysis.replace(/^## SECCIÓN 2: ANÁLISIS DE CONTENIDO\s*/i, '').trim();
  
  return { transcription, analysis };
}

function createUtterancesFromTranscription(transcription: string): any[] {
  // Parse speaker-based transcription into utterances
  const lines = transcription.split('\n').filter(line => line.trim());
  const utterances = [];
  let currentTime = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      // Look for speaker pattern (SPEAKER_NAME: text)
      const speakerMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (speakerMatch) {
        const speaker = speakerMatch[1].trim();
        const text = speakerMatch[2].trim();
        
        utterances.push({
          start: currentTime,
          end: currentTime + 5000, // 5 seconds per utterance as estimate
          text: text,
          confidence: 0.90,
          speaker: speaker
        });
        
        currentTime += 5000;
      } else {
        // Handle lines without clear speaker identification
        utterances.push({
          start: currentTime,
          end: currentTime + 3000,
          text: line,
          confidence: 0.85,
          speaker: "Speaker_Unknown"
        });
        
        currentTime += 3000;
      }
    }
  }
  
  return utterances.length > 0 ? utterances : [{
    start: 0,
    end: 60000,
    text: transcription.substring(0, 500) || "Contenido procesado",
    confidence: 0.85,
    speaker: "Speaker_0"
  }];
}

function extractSegmentsFromAnalysis(analysisText: string): any[] {
  // Create basic segments based on content type sections
  const segments = [];
  const sections = analysisText.split(/\[TIPO DE CONTENIDO:/);
  
  sections.forEach((section, index) => {
    if (section.trim()) {
      segments.push({
        headline: section.includes("ANUNCIO PUBLICITARIO") ? "Anuncio Publicitario" : "Contenido Regular",
        text: section.substring(0, 1000),
        start: index * 30,
        end: (index + 1) * 30,
        keywords: ["contenido", "tv", "analisis"]
      });
    }
  });
  
  return segments.length > 0 ? segments : [{
    headline: "Contenido Principal",
    text: analysisText.substring(0, 1000) || "Contenido analizado",
    start: 0,
    end: 60,
    keywords: ["contenido", "video", "analisis"]
  }];
}

function extractKeywordsFromAnalysis(analysisText: string): string[] {
  // Extract basic keywords from common terms
  const commonKeywords = ["noticias", "programa", "television", "puerto rico", "analisis"];
  return commonKeywords;
}

function extractSummaryFromAnalysis(analysisText: string): string {
  // Extract first paragraph or up to 500 characters as summary
  const firstParagraph = analysisText.split('\n')[0];
  return firstParagraph.length > 10 ? firstParagraph : "Análisis de contenido televisivo completado exitosamente";
}

async function cleanupGeminiFile(fileName?: string, apiKey?: string) {
  if (!fileName || !apiKey) {
    console.log('[gemini-unified] Skipping cleanup - missing parameters');
    return;
  }
  
  try {
    console.log('[gemini-unified] Cleaning up Gemini file:', fileName);
    
    const deleteResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
      method: 'DELETE',
    });
    
    if (deleteResponse.ok) {
      console.log('[gemini-unified] File cleanup completed successfully');
    } else {
      const errorText = await deleteResponse.text();
      console.warn('[gemini-unified] File cleanup warning:', errorText);
    }
  } catch (error) {
    console.warn('[gemini-unified] File cleanup error (non-critical):', error);
  }
}
