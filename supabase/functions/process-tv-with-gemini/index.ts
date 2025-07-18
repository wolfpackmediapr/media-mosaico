
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateEnvironment } from './environment.ts';
import { processVideoWithGemini } from './gemini-unified-processor.ts';
import { validateAndGetFile, downloadVideoWithRetry } from './storage-utils.ts';
import { updateTranscriptionRecord } from './database-utils.ts';
import { categorizeError } from './error-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to process chunked video files with batch processing and monitoring
async function processChunksDirectly(supabase: any, manifest: any, requestId: string, apiKey: string): Promise<any> {
  console.log(`[${requestId}] Processing ${manifest.total_chunks} chunks directly to Gemini...`);
  
  const chunkOrder = manifest.chunk_order;
  const totalExpectedSize = manifest.total_size || 0;
  
  // Memory monitoring
  const startMemory = Deno.memoryUsage ? Deno.memoryUsage() : null;
  console.log(`[${requestId}] Initial memory usage:`, startMemory);
  
  console.log(`[${requestId}] Chunk processing details:`, {
    totalChunks: chunkOrder.length,
    expectedSize: totalExpectedSize,
    directUpload: true,
    chunkSize: Math.round(totalExpectedSize / chunkOrder.length / 1024 / 1024) + 'MB avg per chunk'
  });
  
  // For very large files (>200MB), implement batch processing
  const BATCH_SIZE = totalExpectedSize > 200 * 1024 * 1024 ? 5 : 10;
  const MAX_RETRIES = 3;
  
  if (chunkOrder.length > BATCH_SIZE) {
    console.log(`[${requestId}] Large file detected - using batch processing with size: ${BATCH_SIZE}`);
    return await uploadChunksInBatches(supabase, chunkOrder, manifest, apiKey, requestId, BATCH_SIZE, MAX_RETRIES);
  }
  
  // Use standard resumable upload for smaller files
  return await uploadChunksDirectlyToGemini(supabase, chunkOrder, manifest, apiKey, requestId, MAX_RETRIES);
}

// Re-chunk 5MB chunks into 8MB chunks for Gemini compatibility
async function rechunkForGemini(
  supabase: any,
  chunkOrder: any[],
  manifest: any,
  requestId: string
): Promise<Uint8Array[]> {
  console.log(`[${requestId}] Re-chunking ${chunkOrder.length} chunks for Gemini compatibility...`);
  
  const EIGHT_MB = 8 * 1024 * 1024;
  const rechunkedData: Uint8Array[] = [];
  let currentBuffer = new Uint8Array(0);
  
  for (let i = 0; i < chunkOrder.length; i++) {
    const chunk = chunkOrder[i];
    console.log(`[${requestId}] Processing chunk ${i + 1}/${chunkOrder.length} for re-chunking...`);
    
    // Download chunk from Supabase
    const { data: chunkData, error: downloadError } = await supabase.storage
      .from('video')
      .download(chunk.path);
      
    if (downloadError) {
      throw new Error(`Failed to download chunk ${i}: ${downloadError.message}`);
    }
    
    const chunkBuffer = new Uint8Array(await chunkData.arrayBuffer());
    
    // Append to current buffer
    const newBuffer = new Uint8Array(currentBuffer.length + chunkBuffer.length);
    newBuffer.set(currentBuffer);
    newBuffer.set(chunkBuffer, currentBuffer.length);
    currentBuffer = newBuffer;
    
    // While we have enough data for 8MB chunks, extract them
    while (currentBuffer.length >= EIGHT_MB) {
      const chunk8MB = currentBuffer.slice(0, EIGHT_MB);
      rechunkedData.push(chunk8MB);
      currentBuffer = currentBuffer.slice(EIGHT_MB);
    }
    
    // Force garbage collection after each chunk
    chunkBuffer.fill(0); // Clear the buffer
  }
  
  // Add any remaining data as the final chunk
  if (currentBuffer.length > 0) {
    rechunkedData.push(currentBuffer);
  }
  
  console.log(`[${requestId}] Re-chunking complete: ${chunkOrder.length} -> ${rechunkedData.length} chunks`);
  return rechunkedData;
}

// Upload chunks in batches for very large files with re-chunking for Gemini compatibility
async function uploadChunksInBatches(supabase: any, chunkOrder: any[], manifest: any, apiKey: string, requestId: string, batchSize: number, maxRetries: number): Promise<any> {
  console.log(`[${requestId}] Starting batch chunk upload to Gemini (batches of ${batchSize})...`);
  
  const fileName = manifest.file_name || 'video.mp4';
  const mimeType = manifest.mime_type || 'video/mp4';
  
  // Re-chunk the 5MB chunks into 8MB chunks for Gemini compatibility
  const rechunkedData = await rechunkForGemini(supabase, chunkOrder, manifest, requestId);
  
  // Initialize resumable upload session
  console.log(`[${requestId}] Initializing resumable upload session for batch processing...`);
  
  const initResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': manifest.total_size.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      file: { display_name: fileName }
    })
  });

  if (!initResponse.ok) {
    const errorText = await initResponse.text().catch(() => 'Unknown error');
    throw new Error(`Failed to initialize batch upload: ${initResponse.status} - ${errorText}`);
  }

  const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    throw new Error('No upload URL received from Gemini for batch processing');
  }

  console.log(`[${requestId}] Upload session initialized, uploading ${rechunkedData.length} re-chunked pieces...`);
  
  // Upload re-chunked data
  let uploadedBytes = 0;
  let lastUploadResponse;
  
  for (let chunkIndex = 0; chunkIndex < rechunkedData.length; chunkIndex++) {
    const chunkData = rechunkedData[chunkIndex];
    const chunkSize = chunkData.length;
    
    console.log(`[${requestId}] Uploading re-chunked piece ${chunkIndex + 1}/${rechunkedData.length} (${chunkSize} bytes)...`);
    
    let uploadSuccess = false;
    let lastError;
    
    // Retry logic for each chunk
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        // Upload chunk to Gemini
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': chunkSize.toString(),
            'X-Goog-Upload-Offset': uploadedBytes.toString(),
            'X-Goog-Upload-Command': chunkIndex === rechunkedData.length - 1 ? 'upload, finalize' : 'upload'
          },
          body: chunkData
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }
        
        lastUploadResponse = uploadResponse;
        uploadedBytes += chunkSize;
        uploadSuccess = true;
        break; // Success, move to next chunk
        
      } catch (error) {
        lastError = error;
        console.error(`[${requestId}] Chunk ${chunkIndex + 1} upload attempt ${retry + 1} failed:`, error.message);
        
        if (retry < maxRetries - 1) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retry), 5000);
          console.log(`[${requestId}] Retrying chunk ${chunkIndex + 1} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!uploadSuccess) {
      throw new Error(`Failed to upload chunk ${chunkIndex} after ${maxRetries} attempts: ${lastError?.message}`);
    }
    
    // Clear chunk data to free memory
    chunkData.fill(0);
    
    // Memory cleanup and progress logging
    if (globalThis.gc) {
      globalThis.gc();
    }
    
    const progress = Math.round(((chunkIndex + 1) / rechunkedData.length) * 100);
    const currentMemory = Deno.memoryUsage ? Deno.memoryUsage() : null;
    console.log(`[${requestId}] Upload progress: ${progress}% (${chunkIndex + 1}/${rechunkedData.length} re-chunked pieces)`);
    if (currentMemory) {
      console.log(`[${requestId}] Memory usage: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
    }
  }

  console.log(`[${requestId}] All re-chunked pieces uploaded to Gemini, getting file info...`);

  if (!lastUploadResponse) {
    throw new Error('No upload response received from batch processing');
  }
  
  const finalResponse = await lastUploadResponse.json();
  return finalResponse.file;
}

// Upload chunks directly to Gemini using resumable upload (standard method)
async function uploadChunksDirectlyToGemini(supabase: any, chunkOrder: any[], manifest: any, apiKey: string, requestId: string, maxRetries: number = 3): Promise<any> {
  console.log(`[${requestId}] Starting direct chunk upload to Gemini...`);
  
  // Step 1: Initialize resumable upload session with Gemini
  const fileName = manifest.file_name || 'video.mp4';
  const mimeType = manifest.mime_type || 'video/mp4';
  
  // Validate required data
  if (!manifest.total_size || manifest.total_size <= 0) {
    throw new Error('Invalid manifest: missing or invalid total_size');
  }
  
  console.log(`[${requestId}] Initializing resumable upload session...`);
  
  // Start resumable upload session with timeout
  let initResponse;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
    
    initResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': manifest.total_size.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file: {
          display_name: fileName
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
  } catch (fetchError) {
    throw new Error(`Network error initializing Gemini upload: ${fetchError.message}`);
  }

  if (!initResponse.ok) {
    const errorText = await initResponse.text().catch(() => 'Unknown error');
    throw new Error(`Failed to initialize resumable upload: ${initResponse.status} - ${errorText}`);
  }

  const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    throw new Error('No upload URL received from Gemini');
  }

  console.log(`[${requestId}] Upload session initialized, streaming chunks with retry logic...`);

  // Step 2: Stream chunks directly to Gemini with retry logic
  let uploadedBytes = 0;
  let lastUploadResponse;
  
  for (let i = 0; i < chunkOrder.length; i++) {
    const chunkInfo = chunkOrder[i];
    let uploadSuccess = false;
    let lastError;
    
    // Retry logic for each chunk
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        console.log(`[${requestId}] Uploading chunk ${i + 1}/${chunkOrder.length} (attempt ${retry + 1})...`);
        
        // Download chunk from Supabase with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const { data: chunkBlob, error } = await supabase.storage
          .from('video')
          .download(chunkInfo.path);
        
        clearTimeout(timeoutId);
        
        if (error || !chunkBlob) {
          throw new Error(`Failed to download chunk ${i}: ${error?.message || 'Unknown error'}`);
        }
        
        // Upload chunk directly to Gemini with size validation
        const chunkSize = chunkBlob.size;
        
        // Validate chunk size for Gemini requirements
        if (i < chunkOrder.length - 1 && chunkSize % (8 * 1024 * 1024) !== 0) {
          console.warn(`[${requestId}] Chunk ${i} size ${chunkSize} is not a multiple of 8MB`);
        }
        
        const uploadController = new AbortController();
        const uploadTimeoutId = setTimeout(() => uploadController.abort(), 60000); // 60s timeout for upload
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': chunkSize.toString(),
            'X-Goog-Upload-Offset': uploadedBytes.toString(),
            'X-Goog-Upload-Command': i === chunkOrder.length - 1 ? 'upload, finalize' : 'upload'
          },
          body: chunkBlob,
          signal: uploadController.signal
        });
        
        clearTimeout(uploadTimeoutId);

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        lastUploadResponse = uploadResponse;
        uploadedBytes += chunkSize;
        uploadSuccess = true;
        break;
        
      } catch (error) {
        lastError = error;
        console.warn(`[${requestId}] Chunk ${i} upload attempt ${retry + 1} failed:`, error.message);
        
        if (retry < maxRetries - 1) {
          // Exponential backoff
          const waitTime = Math.min(1000 * Math.pow(2, retry), 8000);
          console.log(`[${requestId}] Retrying chunk ${i} in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!uploadSuccess) {
      throw new Error(`Failed to upload chunk ${i} after ${maxRetries} attempts: ${lastError?.message}`);
    }
    
    // Memory cleanup after each chunk
    if (globalThis.gc) {
      globalThis.gc();
    }
    
    // Progress logging
    if ((i + 1) % 5 === 0 || i === chunkOrder.length - 1) {
      const progress = Math.round(((i + 1) / chunkOrder.length) * 100);
      const currentMemory = Deno.memoryUsage ? Deno.memoryUsage() : null;
      console.log(`[${requestId}] Upload progress: ${progress}% (${i + 1}/${chunkOrder.length} chunks)`);
      if (currentMemory) {
        console.log(`[${requestId}] Memory usage: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
      }
    }
  }

  console.log(`[${requestId}] All chunks uploaded directly to Gemini, getting file info...`);

  // Step 3: Get the final uploaded file info from the last response
  if (!lastUploadResponse) {
    throw new Error('No upload response received');
  }
  
  const finalResponse = await lastUploadResponse.json();
  return finalResponse.file;
}

// Process already uploaded file with Gemini (for direct chunk uploads)
async function processUploadedFileWithGemini(
  uploadedFile: any, 
  apiKey: string, 
  videoPath: string,
  progressCallback?: (progress: number) => void,
  categories: any[] = [],
  clients: any[] = []
) {
  try {
    console.log('[gemini-unified] Processing already uploaded file...', {
      fileName: uploadedFile.name,
      displayName: uploadedFile.displayName,
      videoPath,
      categoriesCount: categories.length,
      clientsCount: clients.length
    });
    
    // Step 1: Wait for processing (30% progress when complete)
    progressCallback?.(0.1);
    const processedFile = await waitForFileProcessing(uploadedFile.name, apiKey, progressCallback);
    
    // Step 2: Generate comprehensive analysis (80% progress when complete)
    progressCallback?.(0.5);
    const analysisResult = await generateComprehensiveAnalysis(processedFile.uri, apiKey, categories, clients);
    
    // Step 3: Cleanup (100% progress)
    progressCallback?.(0.9);
    await cleanupGeminiFile(processedFile.name, apiKey);
    
    progressCallback?.(1.0);
    console.log('[gemini-unified] Uploaded file processing completed successfully');
    
    return analysisResult;
    
  } catch (error) {
    console.error('[gemini-unified] Uploaded file processing error:', error);
    throw new Error(`Uploaded file processing failed: ${error.message}`);
  }
}

// Import required functions from gemini-unified-processor.ts
async function waitForFileProcessing(fileName: string, apiKey: string, progressCallback?: (progress: number) => void, maxAttempts = 30) {
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
      progressCallback?.(0.1 + (attempt / maxAttempts) * 0.3);
      
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
  // This function will be imported from gemini-unified-processor.ts
  // For now, we'll call the external function
  const { generateComprehensiveAnalysis: externalAnalysis } = await import('./gemini-unified-processor.ts');
  return await externalAnalysis(fileUri, apiKey, categories, clients);
}

async function cleanupGeminiFile(fileName: string, apiKey: string) {
  try {
    console.log('[gemini-unified] Cleaning up Gemini file:', fileName);
    
    const deleteResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
      method: 'DELETE'
    });
    
    if (!deleteResponse.ok) {
      console.warn('[gemini-unified] Failed to cleanup file:', await deleteResponse.text());
    } else {
      console.log('[gemini-unified] File cleanup completed');
    }
  } catch (error) {
    console.warn('[gemini-unified] Cleanup error (non-critical):', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let requestBody: any = {}; // Initialize to avoid scope issues
  
  try {
    console.log(`[${requestId}] === UNIFIED PROCESSING START ===`);
    
    // Step 1: Validate environment (wrap in try-catch for better error handling)
    let supabaseUrl, supabaseServiceKey, geminiApiKey;
    try {
      const env = validateEnvironment();
      supabaseUrl = env.supabaseUrl;
      supabaseServiceKey = env.supabaseServiceKey;
      geminiApiKey = env.geminiApiKey;
      console.log(`[${requestId}] Environment validated successfully`);
    } catch (envError) {
      console.error(`[${requestId}] Environment validation failed:`, envError);
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          success: false 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Step 2: Parse and validate request
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { videoPath, transcriptionId } = requestBody;
    
    console.log(`[${requestId}] Request details:`, {
      videoPath,
      transcriptionId,
      hasVideoPath: !!videoPath,
      hasTranscriptionId: !!transcriptionId,
      videoPathLength: videoPath?.length
    });
    
    if (!videoPath) {
      return new Response(
        JSON.stringify({ 
          error: 'Video path is required',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth context
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError) {
        console.error(`[${requestId}] Auth error:`, authError);
      } else {
        console.log(`[${requestId}] Authenticated user:`, user?.id);
      }
    }

    // Step 3.5: Fetch categories and clients for dynamic prompt
    console.log(`[${requestId}] Fetching categories and clients for dynamic prompt...`);
    let categories = [];
    let clients = [];
    
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('name_es, name_en');
      
      if (!categoriesError && categoriesData) {
        categories = categoriesData;
        console.log(`[${requestId}] Fetched ${categories.length} categories`);
      }
      
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('name, category, keywords');
      
      if (!clientsError && clientsData) {
        clients = clientsData;
        console.log(`[${requestId}] Fetched ${clients.length} clients`);
      }
    } catch (fetchError) {
      console.warn(`[${requestId}] Failed to fetch categories/clients, using defaults:`, fetchError);
    }

    // Step 4: Update initial processing status
    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        status: 'processing',
        progress: 10
      });
      console.log(`[${requestId}] Updated transcription status to processing`);
    }

    // Step 5: Handle chunked vs assembled video files
    let result;
    
    if (videoPath.startsWith('chunked:')) {
      // Handle chunked video files with direct upload (no memory reassembly)
      const sessionId = videoPath.replace('chunked:', '');
      console.log(`[${requestId}] Processing chunked video with session ID: ${sessionId}`);
      
      // Get chunk manifest with better error handling
      let manifest;
      try {
        const { data: manifestData, error: manifestError } = await supabase
          .from('video_chunk_manifests')
          .select('*')
          .eq('session_id', sessionId)
          .single();
        
        if (manifestError) {
          console.error(`[${requestId}] Manifest query error:`, manifestError);
          throw new Error(`Failed to load chunk manifest for session: ${sessionId} - ${manifestError.message}`);
        }
        
        if (!manifestData) {
          throw new Error(`No chunk manifest found for session: ${sessionId}`);
        }
        
        manifest = manifestData;
        console.log(`[${requestId}] Found chunk manifest with ${manifest.total_chunks} chunks`);
        
        // Validate manifest structure
        if (!manifest.chunk_order || !Array.isArray(manifest.chunk_order)) {
          throw new Error(`Invalid chunk manifest structure for session: ${sessionId}`);
        }
        
      } catch (manifestError) {
        console.error(`[${requestId}] Manifest processing failed:`, manifestError);
        throw new Error(`Chunk manifest error: ${manifestError.message}`);
      }
      
      if (transcriptionId) {
        await updateTranscriptionRecord(supabase, transcriptionId, {
          progress: 20
        });
      }

      // Process chunks directly to Gemini without memory reassembly
      console.log(`[${requestId}] Starting direct chunk processing to avoid memory issues...`);
      let uploadedFile;
      try {
        uploadedFile = await processChunksDirectly(supabase, manifest, requestId, geminiApiKey);
      } catch (chunkError) {
        console.error(`[${requestId}] Chunk processing failed:`, chunkError);
        throw new Error(`Chunk processing error: ${chunkError.message}`);
      }
      
      if (transcriptionId) {
        await updateTranscriptionRecord(supabase, transcriptionId, {
          progress: 40
        });
      }

      // Wait for processing and analyze
      result = await processUploadedFileWithGemini(
        uploadedFile, 
        geminiApiKey, 
        videoPath,
        (progress) => {
          const progressPercent = Math.min(40 + Math.floor(progress * 50), 90);
          console.log(`[${requestId}] Processing progress: ${(progress * 100).toFixed(1)}% (${progressPercent}%)`);
          
          if (transcriptionId) {
            updateTranscriptionRecord(supabase, transcriptionId, {
              progress: progressPercent
            }).catch(err => console.warn(`[${requestId}] Progress update failed:`, err));
          }
        },
        categories,
        clients
      );
      
    } else {
      // Handle regular assembled video files with traditional method
      console.log(`[${requestId}] Processing assembled video file from video bucket...`);
      const videoUrl = await validateAndGetFile(supabase, videoPath);
      console.log(`[${requestId}] Video file validated successfully`);
      
      if (transcriptionId) {
        await updateTranscriptionRecord(supabase, transcriptionId, {
          progress: 20
        });
      }

      // Download video with retry
      console.log(`[${requestId}] Downloading video...`);
      const videoBlob = await downloadVideoWithRetry(videoUrl);
      
      console.log(`[${requestId}] Video processing prepared:`, {
        size: videoBlob.size,
        type: videoBlob.type
      });

      if (transcriptionId) {
        await updateTranscriptionRecord(supabase, transcriptionId, {
          progress: 30
        });
      }

      // Process video with unified Gemini workflow
      console.log(`[${requestId}] Starting unified video processing with dynamic prompt...`);
      result = await processVideoWithGemini(
        videoBlob, 
        geminiApiKey, 
        videoPath,
        (progress) => {
          // Progress callback for updating database
          const progressPercent = Math.min(30 + Math.floor(progress * 60), 90);
          console.log(`[${requestId}] Processing progress: ${(progress * 100).toFixed(1)}% (${progressPercent}%)`);
          
          if (transcriptionId) {
            updateTranscriptionRecord(supabase, transcriptionId, {
              progress: progressPercent
            }).catch(err => console.warn(`[${requestId}] Progress update failed:`, err));
          }
        },
        categories,
        clients
      );
    }

    console.log(`[${requestId}] Processing completed, updating database...`);

    // Step 8: Update database with complete results
    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        transcription_text: result.transcription || 'Transcripción procesada',
        status: 'completed',
        progress: 100,
        summary: result.summary || 'Análisis completado',
        keywords: result.keywords || [],
        analysis_summary: result.summary,
        analysis_quien: result.analysis?.who,
        analysis_que: result.analysis?.what,
        analysis_cuando: result.analysis?.when,
        analysis_donde: result.analysis?.where,
        analysis_porque: result.analysis?.why,
        analysis_keywords: result.keywords || [],
        // Store the full comprehensive analysis
        analysis_content_summary: result.full_analysis || result.summary,
        updated_at: new Date().toISOString()
      });
      console.log(`[${requestId}] Database updated with results`);
    }

    console.log(`[${requestId}] === UNIFIED PROCESSING COMPLETED ===`);

    // Step 9: Return unified response
    return new Response(
      JSON.stringify({
        transcription: result.transcription || 'Transcripción procesada',
        visual_analysis: result.visual_analysis || 'Análisis visual completado',
        segments: result.segments || [],
        keywords: result.keywords || [],
        summary: result.summary || 'Análisis completado',
        analysis: result.analysis || {},
        utterances: result.utterances || [],
        full_analysis: result.full_analysis || '',
        success: true,
        requestId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error(`[${requestId}] === UNIFIED PROCESSING FAILED ===`);
    console.error(`[${requestId}] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      isMemoryError: error.message?.includes('memory') || error.message?.includes('OOM') || error.name === 'RangeError'
    });
    
    // Log memory-specific guidance
    if (error.message?.includes('memory') || error.message?.includes('OOM') || error.name === 'RangeError') {
      console.error(`[${requestId}] MEMORY ERROR DETECTED - File may be too large for processing`);
    }
    
    // Update transcription status to failed if we have the ID (use already parsed requestBody)
    if (requestBody?.transcriptionId) {
      try {
        const { supabaseUrl, supabaseServiceKey } = validateEnvironment();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await updateTranscriptionRecord(supabase, requestBody.transcriptionId, {
          status: 'failed',
          progress: 100
        });
        console.log(`[${requestId}] Updated transcription status to failed`);
      } catch (updateError) {
        console.error(`[${requestId}] Failed to update error status:`, updateError);
      }
    }
    
    const { statusCode, userMessage } = categorizeError(error);
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
        requestId
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
