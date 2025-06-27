
export async function testGeminiConnectivity(apiKey: string): Promise<boolean> {
  try {
    console.log('[process-tv-with-gemini] Testing Gemini API connectivity...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[process-tv-with-gemini] Gemini API test failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Gemini API test failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[process-tv-with-gemini] Gemini API test successful, available models:', data.models?.length || 0);
    return true;
  } catch (error) {
    console.error('[process-tv-with-gemini] Gemini connectivity test error:', error);
    throw new Error(`Gemini API connectivity failed: ${error.message}`);
  }
}

export async function uploadToGemini(videoBlob: Blob, apiKey: string, videoPath: string) {
  try {
    console.log('[process-tv-with-gemini] Uploading to Gemini Files API...');
    
    const formData = new FormData();
    const metadata = {
      file: { 
        displayName: `TV Video Analysis - ${videoPath.split('/').pop()}`,
        mimeType: 'video/mp4'
      }
    };
    
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('file', videoBlob, 'video.mp4');

    const uploadResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[process-tv-with-gemini] Gemini upload error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText
      });
      throw new Error(`Gemini upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('[process-tv-with-gemini] Upload successful:', {
      fileUri: uploadResult.file?.uri,
      fileName: uploadResult.file?.name,
      state: uploadResult.file?.state
    });
    
    return {
      fileUri: uploadResult.file.uri,
      fileName: uploadResult.file.name
    };
    
  } catch (error) {
    console.error('[process-tv-with-gemini] Gemini upload error:', error);
    throw new Error(`Gemini upload failed: ${error.message}`);
  }
}

export async function waitForFileProcessing(fileName: string, apiKey: string): Promise<boolean> {
  const maxAttempts = 15;
  const maxWaitTime = 60000; // 60 seconds total
  const baseDelay = 2000; // 2 seconds base delay
  
  const startTime = Date.now();
  let attempts = 0;
  
  while (attempts < maxAttempts && (Date.now() - startTime) < maxWaitTime) {
    try {
      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(1.5, attempts) + Math.random() * 1000, 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`[process-tv-with-gemini] Checking file status (attempt ${attempts + 1}/${maxAttempts})`);
      
      const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!statusResponse.ok) {
        console.error(`[process-tv-with-gemini] Status check failed: ${statusResponse.status} ${statusResponse.statusText}`);
        attempts++;
        continue;
      }
      
      const statusResult = await statusResponse.json();
      console.log('[process-tv-with-gemini] File status:', {
        state: statusResult.state,
        name: statusResult.name,
        attempt: attempts + 1,
        elapsedTime: Date.now() - startTime
      });
      
      if (statusResult.state === 'ACTIVE') {
        console.log('[process-tv-with-gemini] File processing completed successfully');
        return true;
      } else if (statusResult.state === 'FAILED') {
        throw new Error(`File processing failed in Gemini: ${statusResult.error || 'Unknown error'}`);
      }
      
      attempts++;
      
    } catch (error) {
      console.error(`[process-tv-with-gemini] Status check error (attempt ${attempts + 1}):`, error);
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw error;
      }
    }
  }
  
  throw new Error(`File processing timeout after ${attempts} attempts and ${Date.now() - startTime}ms`);
}

export async function generateAnalysis(fileUri: string, apiKey: string) {
  console.log('[process-tv-with-gemini] Generating comprehensive analysis...');
  
  const prompt = `
  Analyze this TV news video comprehensively and provide a detailed JSON response. The video is from Puerto Rico or Caribbean region.
  
  Please provide:
  1. TRANSCRIPTION: Complete and accurate text transcription of all spoken content
  2. VISUAL ANALYSIS: Description of visual elements, graphics, scenes, people shown
  3. NEWS SEGMENTS: Break content into logical news segments with timestamps, headlines, and content
  4. KEYWORDS: Extract important keywords and topics in Spanish
  5. SUMMARY: Overall summary of the content in Spanish
  6. 5W ANALYSIS: Who, What, When, Where, Why analysis
  
  Format the response as valid JSON with this exact structure:
  {
    "transcription": "complete text transcription in Spanish",
    "visual_analysis": "description of visual elements in Spanish",
    "segments": [
      {
        "headline": "segment headline in Spanish",
        "text": "segment content in Spanish",
        "start": start_time_in_seconds,
        "end": end_time_in_seconds,
        "keywords": ["keyword1", "keyword2"]
      }
    ],
    "keywords": ["overall", "keywords", "in", "spanish"],
    "summary": "overall summary in Spanish",
    "analysis": {
      "who": "who was mentioned",
      "what": "what happened", 
      "when": "when it happened",
      "where": "where it happened",
      "why": "why it happened"
    }
  }
  
  Important: Respond only with valid JSON, no markdown formatting or code blocks.
  `;

  const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { fileData: { mimeType: 'video/mp4', fileUri: fileUri } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      }
    }),
  });

  if (!analysisResponse.ok) {
    const errorText = await analysisResponse.text();
    console.error('[process-tv-with-gemini] Analysis error:', {
      status: analysisResponse.status,
      statusText: analysisResponse.statusText,
      error: errorText
    });
    throw new Error(`Gemini analysis failed: ${analysisResponse.status} - ${errorText}`);
  }

  const analysisResult = await analysisResponse.json();
  console.log('[process-tv-with-gemini] Analysis completed successfully');
  
  if (!analysisResult.candidates || !analysisResult.candidates[0] || !analysisResult.candidates[0].content) {
    throw new Error('Invalid response format from Gemini');
  }
  
  return analysisResult.candidates[0].content.parts[0].text;
}

export async function cleanupGeminiFile(fileName: string, apiKey: string): Promise<void> {
  try {
    const deleteResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      console.log('[process-tv-with-gemini] Gemini file cleaned up successfully');
    } else {
      console.warn('[process-tv-with-gemini] Failed to cleanup Gemini file:', deleteResponse.status);
    }
  } catch (cleanupError) {
    console.warn('[process-tv-with-gemini] Cleanup warning:', cleanupError);
  }
}
