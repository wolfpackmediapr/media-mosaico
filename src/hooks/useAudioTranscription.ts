
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { transcribeWithAssemblyAI, transcribeWithOpenAI } from "@/services/audio/transcriptionService";
import { verifyAuthentication, validateAudioFile } from "@/utils/authUtils";

interface UploadedFile extends File {
  preview?: string;
}

export const useAudioTranscription = () => {
  const navigate = useNavigate();
  
  const processAudioFile = async (
    file: UploadedFile,
    onTranscriptionComplete?: (text: string) => void
  ) => {
    try {
      // Check authentication first
      const user = await verifyAuthentication();
      
      // Validate file type and size
      const validFile = validateAudioFile(file);
      
      console.log('Processing file:', {
        name: validFile.name,
        size: validFile.size,
        type: validFile.type,
        userId: user.id
      });

      // Create FormData and append file and user ID
      const formData = new FormData();
      formData.append('file', validFile);
      formData.append('userId', user.id);

      console.log('Sending request to transcribe with formData:', {
        fileName: validFile.name,
        fileSize: validFile.size,
        userId: user.id
      });

      // Try primary transcription service (AssemblyAI)
      try {
        const data = await transcribeWithAssemblyAI(formData);
        onTranscriptionComplete?.(data.text);
        toast({
          title: "Transcripción completada",
          description: "El archivo ha sido procesado exitosamente con AssemblyAI",
        });
        return;
      } catch (assemblyError) {
        console.error('AssemblyAI transcription failed, falling back to OpenAI:', assemblyError);
      }

      // Fallback to OpenAI Whisper
      try {
        const data = await transcribeWithOpenAI(formData);
        onTranscriptionComplete?.(data.text);
        toast({
          title: "Transcripción completada",
          description: "El archivo ha sido procesado exitosamente con OpenAI Whisper",
        });
        return;
      } catch (openaiError) {
        console.error('OpenAI transcription failed:', openaiError);
        throw openaiError;
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      
      // Special handling for authentication errors
      if (error.message === "AUTH_REQUIRED") {
        throw error;
      }
      
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const processWithAuth = async (
    file: UploadedFile,
    onTranscriptionComplete?: (text: string) => void
  ) => {
    try {
      await processAudioFile(file, onTranscriptionComplete);
      return true;
    } catch (error: any) {
      if (error.message === "AUTH_REQUIRED") {
        // Store the current path to return after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        navigate('/auth');
        return false;
      }
      // Let other errors bubble up
      throw error;
    }
  };
  
  return { processWithAuth };
};
