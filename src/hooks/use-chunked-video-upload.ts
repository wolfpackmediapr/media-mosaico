import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_RETRIES = 3;
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB threshold for client-side reassembly

interface ChunkProgress {
  index: number;
  uploaded: boolean;
  retries: number;
}

interface UploadSession {
  sessionId: string;
  fileName: string;
  totalChunks: number;
  uploadedChunks: number;
  chunks: ChunkProgress[];
  manifestCreated?: boolean;
  playbackType?: 'assembled' | 'chunked';
}

const sanitizeFileName = (fileName: string) => {
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const ext = fileName.substring(fileName.lastIndexOf('.'));
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
  return `${sanitized}${ext}`.toLowerCase();
};

export const useChunkedVideoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [chunkProgress, setChunkProgress] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [useClientAssembly, setUseClientAssembly] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionRef = useRef<UploadSession | null>(null);

  const pauseUpload = () => {
    setIsPaused(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const resumeUpload = async () => {
    if (currentSessionRef.current && isPaused) {
      setIsPaused(false);
      await continueChunkedUpload(currentSessionRef.current);
    }
  };

  const uploadFileChunked = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Error", {
        description: "Por favor, sube únicamente archivos de video."
      });
      return null;
    }


    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Error", {
        description: "Debes iniciar sesión para subir archivos."
      });
      return null;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setIsPaused(false);

      // Determine upload strategy based on file size
      const isLargeFile = file.size > LARGE_FILE_THRESHOLD;
      setUseClientAssembly(isLargeFile);
      
      if (isLargeFile) {
        console.log(`Large file detected (${Math.round(file.size / 1024 / 1024)}MB) - using client-side reassembly`);
      } else {
        console.log(`Small file detected (${Math.round(file.size / 1024 / 1024)}MB) - using edge function reassembly`);
      }

      const sanitizedFileName = sanitizeFileName(file.name);
      const fileName = `${user.id}/${Date.now()}_${sanitizedFileName}`;
      const sessionId = `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const chunks = Math.ceil(file.size / CHUNK_SIZE);
      setTotalChunks(chunks);

      const session: UploadSession = {
        sessionId,
        fileName,
        totalChunks: chunks,
        uploadedChunks: 0,
        chunks: Array.from({ length: chunks }, (_, index) => ({
          index,
          uploaded: false,
          retries: 0
        }))
      };

      currentSessionRef.current = session;

      // Store session in localStorage and database for resume capability
      localStorage.setItem(`upload_session_${sessionId}`, JSON.stringify(session));
      
      // Track session in database
      const { error: sessionError } = await supabase
        .from('chunked_upload_sessions')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          file_name: fileName,
          total_chunks: chunks,
          uploaded_chunks: 0,
          file_size: file.size,
          status: 'in_progress'
        });

      if (sessionError) {
        console.warn('Could not track session in database:', sessionError);
      }

      const result = await continueChunkedUpload(session, file);
      return result;
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error("Error al subir el archivo", {
          description: error.message || "Ocurrió un error al subir el archivo. Puedes pausar y reanudar la subida."
        });
      }
      return null;
    } finally {
      if (!isPaused) {
        setIsUploading(false);
      }
    }
  };

  const updateSession = (session: UploadSession) => {
    localStorage.setItem(`upload_session_${session.sessionId}`, JSON.stringify(session));
  };

  const removeSession = (sessionId: string) => {
    localStorage.removeItem(`upload_session_${sessionId}`);
  };

  const continueChunkedUpload = async (session: UploadSession, file?: File) => {
    if (!file) {
      console.error('File is required for chunked upload');
      return null;
    }

    try {
      setIsUploading(true);
      setUploadProgress(session.uploadedChunks / session.totalChunks);
      setChunkProgress(0);
      setTotalChunks(session.totalChunks);
      setIsPaused(false);

      const fileName = sanitizeFileName(session.fileName);
      const chunks = Math.ceil(file.size / CHUNK_SIZE);
      
      console.log(`Continuing upload: ${fileName}, chunks: ${chunks}, uploaded: ${session.uploadedChunks}`);

      // Use consistent chunked upload strategy for all file sizes
      // Upload chunks to temporary location for edge function reassembly
      for (let i = session.uploadedChunks; i < chunks; i++) {
        if (isPaused) {
          console.log('Upload paused');
          break;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const chunkFileName = `chunks/${session.sessionId}/chunk_${i.toString().padStart(4, '0')}`;

        let retries = 0;
        while (retries < MAX_RETRIES) {
          try {
            setChunkProgress((i / chunks) * 100);
            
            const { error } = await supabase.storage
              .from('video')
              .upload(chunkFileName, chunk, {
                cacheControl: '3600',
                upsert: true
              });

            if (error) {
              throw error;
            }

            console.log(`Uploaded chunk ${i + 1}/${chunks}`);
            
            // Update session progress in both local storage and database
            session.uploadedChunks = i + 1;
            updateSession(session);
            
            // Update database session progress
            await supabase
              .from('chunked_upload_sessions')
              .update({ uploaded_chunks: session.uploadedChunks })
              .eq('session_id', session.sessionId);
            
            setUploadProgress(session.uploadedChunks / session.totalChunks);
            break;
          } catch (error) {
            retries++;
            console.error(`Error uploading chunk ${i} (attempt ${retries}):`, error);
            
            if (retries >= MAX_RETRIES) {
              throw new Error(`Failed to upload chunk ${i} after ${MAX_RETRIES} attempts: ${error}`);
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }

      if (isPaused) {
        console.log('Upload was paused');
        return null;
      }

      console.log('All chunks uploaded, finalizing upload...');
      setChunkProgress(100);

      // Check if session already completed
      const { data: sessionCheck } = await supabase
        .from('chunked_upload_sessions')
        .select('status, uploaded_chunks, total_chunks')
        .eq('session_id', session.sessionId)
        .single();

      if (sessionCheck?.status === 'completed') {
        console.log('Session already completed');
        
        // Clean up local session
        removeSession(session.sessionId);
        
        const preview = URL.createObjectURL(file);
        toast.success("Archivo subido exitosamente", {
          description: "El archivo ha sido procesado correctamente."
        });
        
        return { fileName, preview };
      }

      // Use different strategies based on file size
      const fileSizeMB = file.size / 1024 / 1024;
      const isLargeFile = file.size > LARGE_FILE_THRESHOLD;

      if (isLargeFile) {
        // Large files: Create chunk manifest instead of reassembling
        console.log(`Creating chunk manifest for ${fileSizeMB.toFixed(1)}MB file...`);
        return await createChunkManifest(session, file, fileName);
      } else {
        // Small files: Use edge function reassembly
        console.log(`Starting edge function reassembly for ${fileSizeMB.toFixed(1)}MB file...`);
        return await assembleFileEdgeFunction(session, file, fileName, chunks);
      }

      return null; // Should never reach here
    } catch (error) {
      console.error('Chunked upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setChunkProgress(0);
      setTotalChunks(0);
    }
  };

  // Create chunk manifest for large files
  const createChunkManifest = async (session: UploadSession, file: File, fileName: string) => {
    try {
      console.log('Creating chunk manifest for large file...');
      
      // Prepare chunk information
      const chunkOrder = [];
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = `chunks/${session.sessionId}/chunk_${i.toString().padStart(4, '0')}`;
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkSize = end - start;
        
        chunkOrder.push({
          index: i,
          path: chunkPath,
          size: chunkSize,
          start,
          end
        });
      }

      // Create chunk manifest in database
      const { data: manifestData, error: manifestError } = await supabase
        .from('video_chunk_manifests')
        .insert({
          session_id: session.sessionId,
          file_name: fileName,
          total_size: file.size,
          total_chunks: session.totalChunks,
          chunk_order: chunkOrder,
          mime_type: file.type,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (manifestError) {
        throw new Error(`Failed to create chunk manifest: ${manifestError.message}`);
      }

      // Update session to mark as chunked playback type
      await supabase
        .from('chunked_upload_sessions')
        .update({ 
          status: 'completed',
          manifest_created: true,
          playback_type: 'chunked'
        })
        .eq('session_id', session.sessionId);

      // Create transcription record with chunked reference
      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('tv_transcriptions')
        .insert({
          original_file_path: `chunked:${session.sessionId}`, // Special prefix for chunked files
          audio_file_path: `chunked:${session.sessionId}`,
          status: 'uploaded'
        })
        .select()
        .single();

      if (transcriptionError) {
        console.error('Error creating transcription record:', transcriptionError);
        throw new Error(`Failed to create transcription record: ${transcriptionError.message}`);
      }

      // Clean up session
      removeSession(session.sessionId);
      
      const preview = URL.createObjectURL(file);
      console.log('Chunk manifest created successfully');
      
      toast.success("Archivo subido exitosamente", {
        description: "El archivo grande ha sido almacenado como chunks para reproducción optimizada."
      });
      
      return { fileName: `chunked:${session.sessionId}`, preview };
      
    } catch (error) {
      console.error('Chunk manifest creation failed:', error);
      throw new Error(`Chunk manifest creation failed: ${error.message}`);
    }
  };

  // Client-side reassembly for large files (kept as fallback)
  const assembleFileClientSide = async (session: UploadSession, file: File, fileName: string) => {
    try {
      console.log('Starting client-side streaming reassembly...');
      
      // Create a streaming approach to avoid memory issues
      const chunks: Blob[] = [];
      
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = `chunks/${session.sessionId}/chunk_${i.toString().padStart(4, '0')}`;
        
        try {
          const { data: chunkBlob, error: chunkError } = await supabase.storage
            .from('video')
            .download(chunkPath);
            
          if (chunkError || !chunkBlob) {
            throw new Error(`Failed to download chunk ${i}: ${chunkError?.message}`);
          }
          
          chunks.push(chunkBlob);
          
          // Update progress during download
          const downloadProgress = ((i + 1) / session.totalChunks) * 50; // First half of progress
          setUploadProgress(downloadProgress / 100);
          
        } catch (error) {
          console.error(`Error downloading chunk ${i}:`, error);
          throw new Error(`Failed to download chunk ${i}: ${error.message}`);
        }
      }
      
      console.log('All chunks downloaded, assembling final file...');
      
      // Assemble file from chunks
      const assembledFile = new Blob(chunks, { type: file.type });
      
      // Upload final assembled file
      console.log('Uploading assembled file...');
      const { error: uploadError } = await supabase.storage
        .from('video')
        .upload(fileName, assembledFile, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        throw new Error(`Failed to upload assembled file: ${uploadError.message}`);
      }
      
      // Clean up chunks
      console.log('Cleaning up chunks...');
      const chunkNamesToDelete = [];
      for (let i = 0; i < session.totalChunks; i++) {
        chunkNamesToDelete.push(`chunks/${session.sessionId}/chunk_${i.toString().padStart(4, '0')}`);
      }
      
      await supabase.storage.from('video').remove(chunkNamesToDelete);
      
      // Create transcription record
      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('tv_transcriptions')
        .insert({
          original_file_path: fileName,
          audio_file_path: fileName,
          status: 'uploaded'
        })
        .select()
        .single();

      if (transcriptionError) {
        console.error('Error creating transcription record:', transcriptionError);
        throw new Error(`Failed to create transcription record: ${transcriptionError.message}`);
      }

      // Mark session as completed
      await supabase
        .from('chunked_upload_sessions')
        .update({ status: 'completed' })
        .eq('session_id', session.sessionId);

      // Clean up session
      removeSession(session.sessionId);
      
      const preview = URL.createObjectURL(file);
      console.log('Client-side assembly completed successfully');
      
      toast.success("Archivo subido exitosamente", {
        description: "El archivo ha sido procesado correctamente mediante ensamblaje del lado del cliente."
      });
      
      return { fileName, preview };
      
    } catch (error) {
      console.error('Client-side assembly failed:', error);
      throw new Error(`Client-side assembly failed: ${error.message}`);
    }
  };

  // Edge function reassembly for small files
  const assembleFileEdgeFunction = async (session: UploadSession, file: File, fileName: string, chunks: number) => {
    try {
      console.log('Starting edge function reassembly...');
      
      // Calculate timeout for small files only
      const fileSizeMB = file.size / 1024 / 1024;
      const timeoutMs = 300000; // 5 minutes for small files
      
      console.log(`Using ${Math.round(timeoutMs / 1000)}s timeout for ${fileSizeMB.toFixed(1)}MB file`);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Edge function timeout after ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
      });
      
      // Create reassembly promise
      const reassemblyPromise = supabase.functions.invoke('reassemble-chunked-video', {
        body: {
          sessionId: session.sessionId,
          fileName: fileName,
          totalChunks: chunks
        }
      });
      
      // Race between reassembly and timeout
      const { data, error } = await Promise.race([
        reassemblyPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data?.success) {
        const errorMsg = data?.error || 'Edge function reassembly failed';
        console.error('Edge function failed:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Edge function reassembly successful:', data);

      // Create transcription record
      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('tv_transcriptions')
        .insert({
          original_file_path: fileName,
          audio_file_path: fileName,
          status: 'uploaded'
        })
        .select()
        .single();

      if (transcriptionError) {
        console.error('Error creating transcription record:', transcriptionError);
        throw new Error(`Failed to create transcription record: ${transcriptionError.message}`);
      }

      // Clean up session
      removeSession(session.sessionId);
      
      const preview = URL.createObjectURL(file);
      console.log('Edge function upload completed successfully');
      
      toast.success("Archivo subido exitosamente", {
        description: "El archivo ha sido procesado correctamente."
      });
      
      return { fileName, preview };

    } catch (error) {
      console.error('Edge function assembly failed:', error);
      
      // Final status check before failing
      const { data: finalCheck } = await supabase
        .from('chunked_upload_sessions')
        .select('status')
        .eq('session_id', session.sessionId)
        .single();

      if (finalCheck?.status === 'completed') {
        console.log('Session was completed despite validation error');
        removeSession(session.sessionId);
        const preview = URL.createObjectURL(file);
        toast.success("Archivo subido exitosamente", {
          description: "El archivo ha sido procesado correctamente."
        });
        return { fileName, preview };
      }
      
      throw new Error(`Edge function assembly failed: ${error.message}`);
    }
  };

  return {
    isUploading,
    uploadProgress,
    chunkProgress,
    totalChunks,
    isPaused,
    useClientAssembly,
    uploadFileChunked,
    pauseUpload,
    resumeUpload,
  };
};