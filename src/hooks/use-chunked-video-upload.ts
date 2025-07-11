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
        chunks: Array.from({ length: chunks }, (_, index) => ({
          index,
          uploaded: false,
          retries: 0
        }))
      };

      currentSessionRef.current = session;

      // Store session in localStorage for resume capability
      localStorage.setItem(`upload_session_${sessionId}`, JSON.stringify(session));

      await continueChunkedUpload(session, file);

      return { fileName, preview: URL.createObjectURL(file) };
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

  const continueChunkedUpload = async (session: UploadSession, file?: File) => {
    if (!file && !currentSessionRef.current) {
      toast.error("Error", { description: "No se pudo continuar la subida. Archivo no encontrado." });
      return;
    }

    const uploadFile = file || currentSessionRef.current;
    if (!uploadFile) return;

    abortControllerRef.current = new AbortController();

    try {
      // Upload chunks
      for (let i = 0; i < session.totalChunks; i++) {
        if (isPaused || abortControllerRef.current.signal.aborted) {
          return;
        }

        const chunk = session.chunks[i];
        if (chunk.uploaded) {
          setChunkProgress(i + 1);
          setUploadProgress(((i + 1) / session.totalChunks) * 90); // Reserve 10% for reassembly
          continue;
        }

        let uploadSuccess = false;
        let retryCount = 0;

        while (!uploadSuccess && retryCount < MAX_RETRIES && !isPaused) {
          try {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, (file as File).size);
            const chunkBlob = (file as File).slice(start, end);
            
            const chunkFileName = `chunks/${session.sessionId}/chunk_${i.toString().padStart(4, '0')}`;

            const { error: uploadError } = await supabase.storage
              .from('video')
              .upload(chunkFileName, chunkBlob, {
                cacheControl: '3600',
                upsert: true
              });

            if (uploadError) {
              throw uploadError;
            }

            // Mark chunk as uploaded
            chunk.uploaded = true;
            session.chunks[i] = chunk;
            localStorage.setItem(`upload_session_${session.sessionId}`, JSON.stringify(session));

            setChunkProgress(i + 1);
            setUploadProgress(((i + 1) / session.totalChunks) * 90);
            uploadSuccess = true;

          } catch (error) {
            retryCount++;
            chunk.retries = retryCount;
            console.warn(`Chunk ${i} upload failed, retry ${retryCount}:`, error);
            
            if (retryCount >= MAX_RETRIES) {
              throw new Error(`Error subiendo el fragmento ${i + 1}/${session.totalChunks}. Intenta reanudar la subida.`);
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        }
      }

      if (isPaused) {
        return;
      }

      // Reassemble chunks on the server
      setUploadProgress(95);
      const { data, error: reassembleError } = await supabase.functions.invoke('reassemble-chunked-video', {
        body: {
          sessionId: session.sessionId,
          fileName: session.fileName,
          totalChunks: session.totalChunks
        }
      });

      if (reassembleError) {
        throw new Error('Error al procesar el archivo. Intenta nuevamente.');
      }

      // Create transcription record
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: dbError } = await supabase
          .from('transcriptions')
          .insert({
            user_id: user.id,
            original_file_path: session.fileName,
            status: 'pending',
            channel: 'Canal Example',
            program: 'Programa Example',
            category: 'Noticias',
            broadcast_time: new Date().toISOString(),
            keywords: ['ejemplo', 'prueba']
          });

        if (dbError) throw dbError;
      }

      setUploadProgress(100);
      
      // Clean up session
      localStorage.removeItem(`upload_session_${session.sessionId}`);
      currentSessionRef.current = null;

      toast.success("Archivo subido exitosamente", {
        description: "El archivo grande ha sido procesado correctamente."
      });

    } catch (error) {
      console.error('Error in chunked upload:', error);
      throw error;
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