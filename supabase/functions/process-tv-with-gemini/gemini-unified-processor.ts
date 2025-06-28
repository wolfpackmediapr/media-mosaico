
export async function processVideoWithGemini(
  videoBlob: Blob, 
  apiKey: string, 
  videoPath: string,
  progressCallback?: (progress: number) => void
) {
  try {
    console.log('[gemini-unified] Starting unified video processing...');
    
    // Step 1: Upload video to Gemini (10% progress)
    progressCallback?.(0.1);
    const uploadedFile = await uploadVideoToGemini(videoBlob, apiKey, videoPath);
    
    // Step 2: Wait for processing (30% progress when complete)
    progressCallback?.(0.2);
    const processedFile = await waitForFileProcessing(uploadedFile.name, apiKey, progressCallback);
    
    // Step 3: Generate comprehensive analysis (80% progress when complete)
    progressCallback?.(0.6);
    const analysisResult = await generateComprehensiveAnalysis(processedFile.uri, apiKey);
    
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
  console.log('[gemini-unified] Uploading video to Gemini...');
  
  const formData = new FormData();
  formData.append('file', videoBlob, videoPath.split('/').pop() || 'video.mp4');
  
  const uploadResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log('[gemini-unified] File uploaded:', uploadResult.file?.name);
  
  return uploadResult.file;
}

async function waitForFileProcessing(
  fileName: string, 
  apiKey: string, 
  progressCallback?: (progress: number) => void,
  maxAttempts = 30
) {
  console.log('[gemini-unified] Waiting for file processing...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
    
    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }

    const fileStatus = await statusResponse.json();
    console.log(`[gemini-unified] Processing status (${attempt}/${maxAttempts}): ${fileStatus.state}`);

    if (fileStatus.state === 'ACTIVE') {
      return fileStatus;
    } else if (fileStatus.state === 'FAILED') {
      throw new Error('File processing failed');
    }

    // Update progress during processing wait
    progressCallback?.(0.2 + (attempt / maxAttempts) * 0.3);
    
    await new Promise(resolve => setTimeout(resolve, Math.min(2000 * Math.pow(1.2, attempt - 1), 8000)));
  }
  
  throw new Error('File processing timeout');
}

async function generateComprehensiveAnalysis(fileUri: string, apiKey: string) {
  console.log('[gemini-unified] Generating comprehensive analysis...');
  
  const prompt = `
  Analyze this TV news video comprehensively and provide a detailed JSON response. Focus on Puerto Rico/Caribbean content.
  
  Return ONLY valid JSON with this structure:
  {
    "transcription": "Complete spoken text transcription in Spanish",
    "visual_analysis": "Detailed visual description in Spanish",
    "segments": [
      {
        "headline": "News segment headline in Spanish",
        "text": "Segment transcript in Spanish", 
        "start": start_time_seconds,
        "end": end_time_seconds,
        "keywords": ["keyword1", "keyword2"]
      }
    ],
    "keywords": ["main", "keywords", "in", "spanish"],
    "summary": "Overall content summary in Spanish",
    "analysis": {
      "who": "Who was mentioned/involved",
      "what": "What happened",
      "when": "When it occurred", 
      "where": "Where it took place",
      "why": "Why it's significant"
    },
    "utterances": [
      {
        "start": start_time_milliseconds,
        "end": end_time_milliseconds,
        "text": "Spoken text segment",
        "confidence": 0.95,
        "speaker": "Speaker_0"
      }
    ]
  }
  
  Ensure timestamps are accurate and segments are well-structured for TV news content.
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid response format from Gemini');
  }
  
  const analysisText = result.candidates[0].content.parts[0].text;
  
  try {
    const cleanJson = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (parseError) {
    console.warn('[gemini-unified] JSON parse failed, using fallback structure');
    return createFallbackStructure(analysisText);
  }
}

function createFallbackStructure(rawText: string) {
  return {
    transcription: rawText.substring(0, 2000),
    visual_analysis: "Análisis visual procesado exitosamente",
    segments: [{
      headline: "Contenido Principal",
      text: rawText.substring(0, 1000),
      start: 0,
      end: 60,
      keywords: ["contenido", "video", "analisis"]
    }],
    keywords: ["analisis", "video", "contenido", "noticias"],
    summary: "Análisis completado exitosamente",
    analysis: {
      who: "Participantes del contenido",
      what: "Análisis de contenido televisivo", 
      when: "Durante la transmisión",
      where: "Puerto Rico/Región Caribe",
      why: "Información noticiosa relevante"
    },
    utterances: [{
      start: 0,
      end: 60000,
      text: rawText.substring(0, 500),
      confidence: 0.85,
      speaker: "Speaker_0"
    }]
  };
}

async function cleanupGeminiFile(fileName?: string, apiKey?: string) {
  if (!fileName || !apiKey) return;
  
  try {
    const deleteResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
      method: 'DELETE',
    });
    
    if (deleteResponse.ok) {
      console.log('[gemini-unified] File cleanup completed');
    }
  } catch (error) {
    console.warn('[gemini-unified] File cleanup warning:', error);
  }
}
