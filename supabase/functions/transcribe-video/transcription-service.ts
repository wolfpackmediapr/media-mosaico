import { formatTimestamp, calculateSegmentTimestamps } from "../_shared/time-utils.ts";

/**
 * Process audio with OpenAI Whisper API
 */
export const processWithWhisper = async (fileData: Blob): Promise<any> => {
  console.log('Calling Whisper API');
  const formData = new FormData();
  formData.append('file', fileData, 'audio.mp3');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'es');

  const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    },
    body: formData,
  });

  if (!whisperResponse.ok) {
    const errorText = await whisperResponse.text();
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  return await whisperResponse.json();
};

/**
 * Process with AssemblyAI for advanced features
 */
export const processWithAssemblyAI = async (audioUrl: string): Promise<any> => {
  console.log('Processing transcript with AssemblyAI Nano model for Spanish');
  
  const assemblyResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: 'es',  // Spanish language code
      speaker_labels: true,
      auto_chapters: true,
      entity_detection: true,
      auto_highlights: true,
      summarization: true,
      summary_type: 'paragraph',
      summary_model: 'conversational',
      model: 'nano'  // Using Nano model which works well with Spanish
    })
  });

  if (!assemblyResponse.ok) {
    console.error('AssemblyAI creation error:', await assemblyResponse.text());
    return null;
  }

  return await assemblyResponse.json();
};

/**
 * Poll AssemblyAI for result completion
 */
export const pollForAssemblyResult = async (jobId: string): Promise<any> => {
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5s * 60)
  
  while (attempts < maxAttempts) {
    attempts++;
    
    const checkResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${jobId}`, {
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '',
      }
    });
    
    if (!checkResponse.ok) {
      console.error('AssemblyAI check error:', await checkResponse.text());
      break;
    }
    
    const transcriptResult = await checkResponse.json();
    
    if (transcriptResult.status === 'completed') {
      console.log('AssemblyAI processing completed');
      return transcriptResult;
    } else if (transcriptResult.status === 'error') {
      console.error('AssemblyAI processing error:', transcriptResult.error);
      break;
    }
    
    console.log(`Waiting for AssemblyAI processing... (${attempts}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
  }
  
  return null;
};

/**
 * Generate segments with GPT-4
 */
export const generateSegmentsWithGPT = async (transcriptionText: string): Promise<any[]> => {
  console.log('Using GPT-4 to identify news segments in Spanish');
  
  const systemPrompt = `Eres un experto en analizar transmisiones de noticias e identificar segmentos distintos en una transcripción.
    Tu tarea es dividir esta transcripción de noticias en español en exactamente 6 segmentos significativos.
    
    IMPORTANTE: DEBES RESPONDER EN ESPAÑOL. Todo el análisis y los segmentos deben estar escritos en español.
    
    Para cada segmento debes identificar:
    1. Un titular periodístico conciso para el segmento (5-8 palabras)
    2. El contenido principal de ese segmento (resumido de la transcripción)
    3. 3-5 palabras clave que representen los principales temas del segmento
    
    Formatea cada segmento así:
    {
      "headline": "Titular Conciso Aquí",
      "text": "Resumen del contenido del segmento...",
      "keywords": ["palabraclave1", "palabraclave2", "palabraclave3"]
    }
    
    Devuelve EXACTAMENTE SEIS segmentos en un array de objetos JSON.
    Asegúrate de que los segmentos cubran diferentes temas o aspectos de la transmisión de noticias.
    
    Importante: NO incluyas explicaciones o notas. Responde SOLO con el array JSON de segmentos en ESPAÑOL.`;
  
  try {
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcriptionText }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5
      })
    });
    
    if (!gptResponse.ok) {
      console.error('GPT-4 API error:', await gptResponse.text());
      return [];
    }
    
    const gptResult = await gptResponse.json();
    console.log('GPT-4 analysis completed');
    
    if (gptResult.choices && gptResult.choices[0]?.message?.content) {
      try {
        const parsedContent = JSON.parse(gptResult.choices[0].message.content);
        if (parsedContent.segments && Array.isArray(parsedContent.segments)) {
          return parsedContent.segments;
        }
      } catch (e) {
        console.error('Error parsing GPT-4 response:', e);
      }
    }
  } catch (e) {
    console.error('Error with GPT-4 analysis:', e);
  }
  
  return [];
};

/**
 * Create segments from transcription data
 */
export const createSegments = (
  assemblyAISegments: any[] = [],
  gptSegments: any[] = [],
  videoDuration: number = 0,
  whisperText: string = ""
): any[] => {
  let finalSegments = [];
  
  if (assemblyAISegments.length >= 6) {
    // Use AssemblyAI segments (up to 6)
    finalSegments = assemblyAISegments.slice(0, 6);
  } else if (gptSegments.length > 0) {
    // If we have GPT segments, use them but add timestamps based on video duration
    finalSegments = gptSegments.map((segment, index) => {
      const { start, end } = calculateSegmentTimestamps(videoDuration, index, 6);
      return {
        ...segment,
        start,
        end
      };
    });
  } else {
    // If no segments from either source, create 6 evenly distributed segments
    for (let i = 0; i < 6; i++) {
      const { start, end } = calculateSegmentTimestamps(videoDuration, i, 6);
      finalSegments.push({
        headline: `Segmento ${i + 1}`,
        text: i === 0 ? whisperText : "",
        start,
        end,
        keywords: []
      });
    }
  }

  // Make sure we have exactly 6 segments
  if (finalSegments.length < 6) {
    // Fill up to 6 segments with placeholder segments if needed
    const segmentDuration = videoDuration > 0 ? videoDuration / 6 : 0;
    
    for (let i = finalSegments.length; i < 6; i++) {
      const start = Math.round(i * segmentDuration);
      const end = Math.round((i + 1) * segmentDuration);
      
      finalSegments.push({
        headline: `Segmento ${i + 1}`,
        text: "",
        start,
        end,
        keywords: []
      });
    }
  } else if (finalSegments.length > 6) {
    // Keep only the first 6 segments
    finalSegments = finalSegments.slice(0, 6);
  }

  // Format the start/end times in HH:MM:SS for each segment
  finalSegments = finalSegments.map(segment => ({
    ...segment,
    timestamp_start: formatTimestamp(segment.start),
    timestamp_end: formatTimestamp(segment.end)
  }));

  return finalSegments;
};

/**
 * Extract news segments from AssemblyAI result
 */
export const extractNewsSegmentsFromAssemblyAI = (transcriptResult: any): any[] => {
  let newsSegments = [];
  
  if (!transcriptResult) return newsSegments;
  
  // If chapters are available, use them as segments
  if (transcriptResult.chapters && transcriptResult.chapters.length > 0) {
    console.log(`Using ${transcriptResult.chapters.length} chapters as news segments`);
    newsSegments = transcriptResult.chapters.map((chapter: any) => ({
      headline: chapter.headline || chapter.gist,
      text: chapter.summary || chapter.gist,
      start: chapter.start,
      end: chapter.end,
      keywords: [] // Will be filled by GPT-4 later
    }));
  } 
  // If no chapters but we have speakers, use speaker transitions as segment boundaries
  else if (transcriptResult.utterances && transcriptResult.utterances.length > 0) {
    console.log(`Using ${transcriptResult.utterances.length} speaker utterances`);
    newsSegments = transcriptResult.utterances.map((utterance: any) => ({
      headline: `Speaker ${utterance.speaker}`,
      text: utterance.text,
      start: utterance.start,
      end: utterance.end,
      keywords: []
    }));
  }
  
  return newsSegments;
};
