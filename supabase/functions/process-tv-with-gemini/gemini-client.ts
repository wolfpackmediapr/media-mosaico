
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

export async function generateAnalysisWithVideo(videoBlob: Blob, apiKey: string, videoPath: string) {
  try {
    console.log('[process-tv-with-gemini] Starting video analysis with Gemini 2.5 Flash...');
    
    // Convert video to base64
    const videoBuffer = await videoBlob.arrayBuffer();
    const videoBase64 = btoa(String.fromCharCode(...new Uint8Array(videoBuffer)));
    
    console.log('[process-tv-with-gemini] Video converted to base64, size:', videoBase64.length);
    
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

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'video/mp4',
                data: videoBase64
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

    console.log('[process-tv-with-gemini] Sending request to Gemini 2.5 Flash...');

    const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
      console.error('[process-tv-with-gemini] Invalid response format:', analysisResult);
      throw new Error('Invalid response format from Gemini');
    }
    
    return analysisResult.candidates[0].content.parts[0].text;
    
  } catch (error) {
    console.error('[process-tv-with-gemini] Video analysis error:', error);
    throw new Error(`Gemini video analysis failed: ${error.message}`);
  }
}

// Legacy functions removed - no longer needed with direct approach
export async function uploadToGemini() {
  throw new Error('uploadToGemini is deprecated - use generateAnalysisWithVideo instead');
}

export async function waitForFileProcessing() {
  throw new Error('waitForFileProcessing is deprecated - use generateAnalysisWithVideo instead');
}

export async function generateAnalysis() {
  throw new Error('generateAnalysis is deprecated - use generateAnalysisWithVideo instead');
}

export async function cleanupGeminiFile() {
  // No cleanup needed with direct approach
  console.log('[process-tv-with-gemini] No cleanup needed with direct analysis approach');
}
