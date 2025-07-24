
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

export async function uploadVideoToGemini(videoBlob: Blob, apiKey: string, videoPath: string) {
  try {
    console.log('[process-tv-with-gemini] Starting video upload to Gemini...', {
      blobSize: videoBlob.size,
      blobType: videoBlob.type,
      videoPath: videoPath
    });
    
    // Validate file size (Gemini has a 20MB limit for video files)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (videoBlob.size > maxSize) {
      throw new Error(`File too large: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB exceeds 20MB limit`);
    }
    
    // Validate file type
    if (!videoBlob.type.startsWith('video/')) {
      throw new Error(`Invalid file type: ${videoBlob.type}. Only video files are supported.`);
    }
    
    const fileName = videoPath.split('/').pop() || 'video.mp4';
    console.log('[process-tv-with-gemini] Uploading file:', fileName);
    
    // Create metadata for the upload
    const metadata = {
      file: {
        display_name: fileName,
        mime_type: videoBlob.type || 'video/mp4'
      }
    };
    
    // First, create the file metadata
    const metadataResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': videoBlob.size.toString(),
        'X-Goog-Upload-Header-Content-Type': videoBlob.type || 'video/mp4',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('[process-tv-with-gemini] Metadata upload error:', {
        status: metadataResponse.status,
        statusText: metadataResponse.statusText,
        error: errorText
      });
      throw new Error(`Metadata upload failed: ${metadataResponse.status} - ${errorText}`);
    }
    
    const uploadUrl = metadataResponse.headers.get('X-Goog-Upload-URL');
    if (!uploadUrl) {
      throw new Error('No upload URL received from Gemini');
    }
    
    console.log('[process-tv-with-gemini] Got upload URL, uploading file data...');
    
    // Now upload the actual file data
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': videoBlob.size.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: videoBlob,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[process-tv-with-gemini] File upload error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText,
        uploadUrl: uploadUrl
      });
      throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('[process-tv-with-gemini] File uploaded successfully:', {
      name: uploadResult.file?.name,
      uri: uploadResult.file?.uri,
      state: uploadResult.file?.state,
      size: uploadResult.file?.sizeBytes
    });
    
    return uploadResult.file;
  } catch (error) {
    console.error('[process-tv-with-gemini] Video upload error:', error);
    // Provide more specific error messages
    if (error.message.includes('File too large')) {
      throw new Error(`Video file is too large. Please use a file smaller than 20MB.`);
    } else if (error.message.includes('Invalid file type')) {
      throw new Error(`Invalid file format. Please upload a video file (MP4, MOV, AVI, etc.).`);
    } else if (error.message.includes('400')) {
      throw new Error(`Upload request invalid. Please check the video file format and try again.`);
    } else if (error.message.includes('401') || error.message.includes('403')) {
      throw new Error(`Authentication failed. Please check your Gemini API key configuration.`);
    } else if (error.message.includes('429')) {
      throw new Error(`Rate limit exceeded. Please wait a moment and try again.`);
    }
    throw new Error(`Video upload failed: ${error.message}`);
  }
}

export async function waitForFileProcessing(fileUri: string, apiKey: string, maxAttempts = 30): Promise<any> {
  console.log('[process-tv-with-gemini] Waiting for file processing to complete...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileUri}?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const fileStatus = await statusResponse.json();
      console.log(`[process-tv-with-gemini] File status check (${attempt}/${maxAttempts}):`, fileStatus.state);

      if (fileStatus.state === 'ACTIVE') {
        console.log('[process-tv-with-gemini] File processing completed successfully');
        return fileStatus;
      } else if (fileStatus.state === 'FAILED') {
        throw new Error('File processing failed');
      }

      // Wait before next attempt (exponential backoff)
      const waitTime = Math.min(2000 * Math.pow(1.5, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
    } catch (error) {
      console.error(`[process-tv-with-gemini] Status check attempt ${attempt} failed:`, error);
      if (attempt === maxAttempts) {
        throw new Error(`File processing timeout after ${maxAttempts} attempts`);
      }
    }
  }
  
  throw new Error('File processing timeout');
}

export async function generateAnalysisWithVideo(videoBlob: Blob, apiKey: string, videoPath: string) {
  try {
    console.log('[process-tv-with-gemini] Starting video analysis with Gemini 2.5 Flash...');
    
    // Step 1: Upload video to Gemini
    const uploadedFile = await uploadVideoToGemini(videoBlob, apiKey, videoPath);
    
    // Step 2: Wait for file processing to complete
    const processedFile = await waitForFileProcessing(uploadedFile.name, apiKey);
    
    // Step 3: Generate analysis using the uploaded file
    console.log('[process-tv-with-gemini] Starting content analysis...');
    
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
              file_data: {
                mime_type: 'video/mp4',
                file_uri: processedFile.uri
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

    console.log('[process-tv-with-gemini] Sending analysis request to Gemini 2.5 Flash...');

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
    
    // Step 4: Cleanup uploaded file
    await cleanupGeminiFile(processedFile.name, apiKey);
    
    return analysisResult.candidates[0].content.parts[0].text;
    
  } catch (error) {
    console.error('[process-tv-with-gemini] Video analysis error:', error);
    throw new Error(`Gemini video analysis failed: ${error.message}`);
  }
}

// Legacy functions removed - no longer needed with proper upload approach
export async function uploadToGemini() {
  throw new Error('uploadToGemini is deprecated - use generateAnalysisWithVideo instead');
}

export async function waitForFileProcessingLegacy() {
  throw new Error('waitForFileProcessing is deprecated - use generateAnalysisWithVideo instead');
}

export async function generateAnalysis() {
  throw new Error('generateAnalysis is deprecated - use generateAnalysisWithVideo instead');
}

export async function cleanupGeminiFile(fileName?: string, apiKey?: string) {
  if (!fileName || !apiKey) {
    console.log('[process-tv-with-gemini] No file cleanup needed');
    return;
  }
  
  try {
    console.log('[process-tv-with-gemini] Cleaning up uploaded file:', fileName);
    
    const deleteResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
      method: 'DELETE',
    });
    
    if (deleteResponse.ok) {
      console.log('[process-tv-with-gemini] File cleanup completed successfully');
    } else {
      console.warn('[process-tv-with-gemini] File cleanup failed, but continuing:', deleteResponse.status);
    }
  } catch (error) {
    console.warn('[process-tv-with-gemini] File cleanup error (non-critical):', error);
  }
}
