import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB limit for TV uploads
const MAX_RETRIES = 3;

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

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Archivo demasiado grande", {
        description: `El archivo excede el límite de ${MAX_FILE_SIZE / (1024 * 1024)}MB. Por favor, reduce su tamaño antes de subirlo.`
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

      // Upload remaining chunks
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
            
            // Update session progress
            session.uploadedChunks = i + 1;
            updateSession(session);
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

      console.log('All chunks uploaded, reassembling file...');
      setChunkProgress(100);

      // Call the edge function to reassemble the file with retry logic
      let reassemblyRetries = 0;
      const MAX_REASSEMBLY_RETRIES = 3;
      
      while (reassemblyRetries < MAX_REASSEMBLY_RETRIES) {
        try {
          console.log(`Attempting reassembly (attempt ${reassemblyRetries + 1}/${MAX_REASSEMBLY_RETRIES})...`);
          
          const { data, error } = await supabase.functions.invoke('reassemble-chunked-video', {
            body: {
              sessionId: session.sessionId,
              fileName: fileName,
              totalChunks: chunks
            }
          });

          if (error) {
            throw new Error(`Edge function error: ${error.message}`);
          }

          if (!data?.success) {
            throw new Error(data?.error || 'Unknown error occurred during file reassembly');
          }

          console.log('File reassembled successfully:', data);

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
          console.log('Upload completed successfully');
          
          toast.success("Archivo subido exitosamente", {
            description: "El archivo grande ha sido procesado correctamente."
          });
          
          return { fileName, preview };

        } catch (error) {
          reassemblyRetries++;
          console.error(`Reassembly attempt ${reassemblyRetries} failed:`, error);
          
          if (reassemblyRetries >= MAX_REASSEMBLY_RETRIES) {
            // If all reassembly attempts failed, clean up chunks and throw error
            console.error('All reassembly attempts failed, cleaning up...');
            try {
              // Clean up uploaded chunks
              for (let i = 0; i < chunks; i++) {
                const chunkFileName = `chunks/${session.sessionId}/chunk_${i.toString().padStart(4, '0')}`;
                await supabase.storage.from('video').remove([chunkFileName]);
              }
            } catch (cleanupError) {
              console.warn('Error during cleanup:', cleanupError);
            }
            
            toast.error("Error al procesar archivo", {
              description: `No se pudo procesar el archivo después de ${MAX_REASSEMBLY_RETRIES} intentos. Intenta nuevamente.`
            });
            
            throw new Error(`Failed to reassemble file after ${MAX_REASSEMBLY_RETRIES} attempts: ${error.message}`);
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, reassemblyRetries - 1)));
        }
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

  return {
    isUploading,
    uploadProgress,
    chunkProgress,
    totalChunks,
    isPaused,
    uploadFileChunked,
    pauseUpload,
    resumeUpload,
  };
};