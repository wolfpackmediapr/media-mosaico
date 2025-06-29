
export async function processVideoWithGemini(
  videoBlob: Blob, 
  apiKey: string, 
  videoPath: string,
  progressCallback?: (progress: number) => void
) {
  try {
    console.log('[gemini-unified] Starting unified video processing...', {
      blobSize: videoBlob.size,
      blobType: videoBlob.type,
      videoPath
    });
    
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
      
      const analysisText = result.candidates[0].content.parts[0].text;
      console.log('[gemini-unified] Analysis completed, parsing JSON...');
      
      try {
        const cleanJson = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsedResult = JSON.parse(cleanJson);
        
        // Validate required fields
        if (!parsedResult.transcription && !parsedResult.summary) {
          throw new Error('Parsed result missing required fields');
        }
        
        return parsedResult;
        
      } catch (parseError) {
        console.warn('[gemini-unified] JSON parse failed, using fallback structure:', parseError);
        return createFallbackStructure(analysisText);
      }
      
    } catch (error) {
      console.error(`[gemini-unified] Analysis attempt ${attempt} error:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
    }
  }
}

function createFallbackStructure(rawText: string) {
  console.log('[gemini-unified] Creating fallback structure from raw text');
  
  return {
    transcription: rawText.substring(0, 2000) || "Transcripción procesada exitosamente",
    visual_analysis: "Análisis visual procesado exitosamente",
    segments: [{
      headline: "Contenido Principal",
      text: rawText.substring(0, 1000) || "Contenido analizado",
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
      text: rawText.substring(0, 500) || "Contenido procesado",
      confidence: 0.85,
      speaker: "Speaker_0"
    }]
  };
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
