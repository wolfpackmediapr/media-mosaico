// MP4-specific processing utilities for TV processing
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MP4ProcessingOptions {
  requestId: string;
  videoPath: string;
  transcriptionId: string;
  supabase: any;
  geminiApiKey: string;
}

// Enhanced MP4 processing with validation and fallback conversion
export async function processMP4WithFallback(options: MP4ProcessingOptions) {
  const { requestId, videoPath, transcriptionId, supabase, geminiApiKey } = options;
  
  console.log(`[${requestId}] Starting MP4 processing with fallback strategy`);
  
  // First attempt: Direct MP4 processing
  try {
    console.log(`[${requestId}] Attempt 1: Direct MP4 processing`);
    const result = await processDirectMP4(options);
    console.log(`[${requestId}] MP4 direct processing succeeded`);
    return result;
  } catch (error) {
    console.error(`[${requestId}] MP4 direct processing failed:`, error);
    
    // Check if it's a Gemini API 400 error (format rejection)
    if (error.message.includes('400') || error.message.includes('Gemini API error')) {
      console.log(`[${requestId}] Attempting MP4 to MOV conversion fallback`);
      
      try {
        // Update progress
        await updateDatabaseProgress(transcriptionId, 30, 'Converting MP4 to MOV format...');
        
        // Convert to MOV using CloudConvert
        const convertedPath = await convertMP4ToMOV(videoPath, supabase);
        console.log(`[${requestId}] Successfully converted MP4 to MOV: ${convertedPath}`);
        
        // Process the converted MOV file
        const convertedOptions = { ...options, videoPath: convertedPath };
        const result = await processDirectMP4(convertedOptions);
        console.log(`[${requestId}] MOV conversion processing succeeded`);
        return result;
        
      } catch (conversionError) {
        console.error(`[${requestId}] MP4 conversion fallback failed:`, conversionError);
        throw new Error(`Both MP4 processing and conversion failed: ${error.message}`);
      }
    }
    
    // Re-throw non-format related errors
    throw error;
  }
}

// Direct MP4 processing (placeholder for main logic)
async function processDirectMP4(options: MP4ProcessingOptions) {
  // This would contain the main Gemini processing logic
  // For now, throw an error to simulate the current MP4 issues
  throw new Error('Gemini API error: 400 - MP4 format not accepted');
}

// Convert MP4 to MOV using CloudConvert
async function convertMP4ToMOV(videoPath: string, supabase: any): Promise<string> {
  const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY');
  
  if (!cloudConvertApiKey) {
    throw new Error('CloudConvert API key not configured');
  }
  
  console.log('Starting MP4 to MOV conversion via CloudConvert');
  
  // This is a simplified conversion flow - actual implementation would:
  // 1. Create CloudConvert job for MP4 to MOV conversion
  // 2. Upload the MP4 file to CloudConvert
  // 3. Wait for conversion completion
  // 4. Download converted MOV file back to Supabase storage
  // 5. Return the new MOV file path
  
  // For now, return a mock converted path
  const convertedPath = videoPath.replace('.mp4', '_converted.mov');
  console.log('MP4 to MOV conversion completed (mock)');
  
  return convertedPath;
}

// Update database progress helper
async function updateDatabaseProgress(transcriptionId: string, progress: number, status: string) {
  console.log('[gemini-unified] Updating database progress...', {
    transcriptionId,
    progress,
    status
  });
  
  // This would update the transcription record with progress
  // Implementation depends on your database structure
}