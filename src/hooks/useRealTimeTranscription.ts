import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { debounce } from "lodash";
import { supabase } from "@/integrations/supabase/client";
import { validateAudioFile } from "@/utils/file-validation";

export interface Word {
  text: string;
  start: number;
  end: number;
}

export interface UtteranceTimestamp {
  speaker: string | number;
  text: string;
  start: number;
  end: number;
  words?: Word[];
}

interface WebSocketMessage {
  message_type: "FinalTranscript" | "PartialTranscript" | "SessionBegins" | "SessionTerminated";
  speaker?: string | number;
  text: string;
  words?: Word[];
  start?: number;
  end?: number;
}

export interface RealTimeTranscriptionProps {
  audioFile?: File;
  onTranscriptionComplete?: (text: string) => void;
  onUtterancesReceived?: (utterances: UtteranceTimestamp[]) => void;
  languageCode?: string;
  expectedSpeakers?: number;
}

const ASSEMBLYAI_API_KEY = import.meta.env.VITE_ASSEMBLYAI_API_KEY;

export function useRealTimeTranscription({
  audioFile,
  onTranscriptionComplete,
  onUtterancesReceived,
  languageCode = "es",
  expectedSpeakers = 2,
}: RealTimeTranscriptionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [utterances, setUtterances] = useState<UtteranceTimestamp[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [progress, setProgress] = useState(0);
  
  const socketRef = useRef<WebSocket | null>(null);
  const audioStartTimeRef = useRef<number>(0);
  const audioBufferRef = useRef<string[]>([]);
  const reconnectAttemptsRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const maxReconnectAttempts = 5;
  const audioStreamRef = useRef<MediaStream | null>(null);

  const getToken = async (): Promise<string> => {
    try {
      if (!ASSEMBLYAI_API_KEY) {
        throw new Error("AssemblyAI API key is not configured");
      }
      
      try {
        const { data, error } = await supabase.functions.invoke("get-assemblyai-token", {
          body: { expires_in: 3600 }
        });
        
        if (error) throw error;
        return data.token;
      } catch (e) {
        console.warn("Edge function failed, falling back to direct API call:", e);
        
        const response = await fetch("https://api.assemblyai.com/v2/realtime/token", {
          method: "POST",
          headers: {
            Authorization: ASSEMBLYAI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expires_in: 3600 }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to get token: ${response.status}`);
        }
        
        const data = await response.json();
        return data.token;
      }
    } catch (error) {
      console.error("Error getting AssemblyAI token:", error);
      toast.error("Error connecting to transcription service");
      throw error;
    }
  };

  const connectWebSocket = async () => {
    try {
      const token = await getToken();
      
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      
      socketRef.current = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`
      );

      socketRef.current.onopen = () => {
        console.log("[RealTimeTranscription] WebSocket connected");
        
        socketRef.current?.send(
          JSON.stringify({
            language_code: languageCode,
            sample_rate: 16000,
            speakers_expected: expectedSpeakers,
            word_timestamps: true,
          })
        );
        
        reconnectAttemptsRef.current = 0;
        
        audioBufferRef.current.forEach((chunk) => socketRef.current?.send(chunk));
        audioBufferRef.current = [];
      };

      socketRef.current.onmessage = (message: MessageEvent<string>) => {
        try {
          const data: WebSocketMessage = JSON.parse(message.data);
          
          if (data.message_type === "FinalTranscript") {
            setTranscription(prev => prev + " " + data.text);
            
            const utterance: UtteranceTimestamp = {
              speaker: data.speaker || "unknown",
              text: data.text,
              start: data.start || 0,
              end: data.end || 0,
              words: data.words || []
            };
            
            setUtterances(prev => [...prev, utterance]);
            
            if (onUtterancesReceived) {
              onUtterancesReceived([...utterances, utterance]);
            }
          }
        } catch (error) {
          console.error("[RealTimeTranscription] Error processing message:", error);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error("[RealTimeTranscription] WebSocket error:", error);
        toast.error("Network error: WebSocket connection failed.");
      };

      socketRef.current.onclose = (event) => {
        console.log("[RealTimeTranscription] WebSocket closed:", event.code, event.reason);
        
        if (isProcessing && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
          
          setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connectWebSocket();
            toast.info(`Reconnecting to transcription service... Attempt ${reconnectAttemptsRef.current}`);
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          toast.error("Failed to reconnect to transcription service after multiple attempts.");
          setIsProcessing(false);
        }
      };
    } catch (error) {
      console.error("[RealTimeTranscription] Error connecting to WebSocket:", error);
      toast.error("Failed to connect to transcription service");
      setIsProcessing(false);
    }
  };

  const startFromMicrophone = async () => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setTranscription("");
      setUtterances([]);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      await connectWebSocket();
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          try {
            const buffer = await event.data.arrayBuffer();
            const base64Audio = arrayBufferToBase64(buffer);
            const message = JSON.stringify({ audio_data: base64Audio });
            
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(message);
              setProgress(prev => Math.min(99, prev + 1));
            } else {
              audioBufferRef.current.push(message);
            }
          } catch (error) {
            console.error("[RealTimeTranscription] Error processing audio chunk:", error);
          }
        }
      };
      
      mediaRecorder.start(500);
      audioStartTimeRef.current = Date.now();
      
    } catch (error) {
      console.error("[RealTimeTranscription] Error starting from microphone:", error);
      toast.error("Failed to access microphone");
      setIsProcessing(false);
    }
  };

  const startFromFile = async (file: File) => {
    try {
      if (!validateAudioFile(file)) {
        setIsProcessing(false);
        return;
      }
      
      setIsProcessing(true);
      setProgress(0);
      setTranscription("");
      setUtterances([]);
      
      await connectWebSocket();
      
      const fileBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(fileBuffer);
      
      const sampleRate = 16000;
      const offlineContext = new OfflineAudioContext(
        1,
        audioBuffer.duration * sampleRate,
        sampleRate
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const renderedBuffer = await offlineContext.startRendering();
      const audioData = renderedBuffer.getChannelData(0);
      
      const chunkSize = sampleRate;
      const totalChunks = Math.ceil(audioData.length / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        if (!isProcessing) break;
        
        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize, audioData.length);
        const chunk = audioData.slice(start, end);
        
        const bytes = new Uint8Array(chunk.length * 4);
        let pos = 0;
        for (let j = 0; j < chunk.length; j++) {
          const value = chunk[j];
          const intValue = Math.floor(value * 32767);
          bytes[pos++] = intValue & 0xff;
          bytes[pos++] = (intValue >> 8) & 0xff;
        }
        
        const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
        const message = JSON.stringify({ audio_data: base64Audio });
        
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(message);
          setProgress(Math.round((i / totalChunks) * 100));
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          audioBufferRef.current.push(message);
        }
      }
      
      setProgress(100);
      
      setTimeout(() => {
        if (onTranscriptionComplete) {
          onTranscriptionComplete(transcription);
        }
        stopTranscription();
      }, 2000);
      
    } catch (error) {
      console.error("[RealTimeTranscription] Error processing file:", error);
      toast.error("Failed to process audio file");
      setIsProcessing(false);
    }
  };

  const stopTranscription = useCallback(() => {
    try {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      audioBufferRef.current = [];
      
      if (onTranscriptionComplete) {
        onTranscriptionComplete(transcription);
      }
      
      setIsProcessing(false);
      setProgress(100);
    } catch (error) {
      console.error("[RealTimeTranscription] Error stopping transcription:", error);
    }
  }, [transcription, onTranscriptionComplete]);

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const updateHighlight = useCallback(debounce((currentTime: number) => {
    let foundIndex = -1;
    
    utterances.forEach(utterance => {
      if (utterance.words) {
        utterance.words.forEach((word, index) => {
          const wordStart = word.start > 1000 ? word.start / 1000 : word.start;
          const wordEnd = word.end > 1000 ? word.end / 1000 : word.end;
          
          if (currentTime >= wordStart && currentTime <= wordEnd) {
            foundIndex = index;
          }
        });
      }
    });
    
    setCurrentWordIndex(foundIndex);
  }, 50), [utterances]);

  useEffect(() => {
    if (audioFile && !isProcessing) {
      startFromFile(audioFile);
    }
    
    return () => {
      if (isProcessing) {
        stopTranscription();
      }
    };
  }, [audioFile]);

  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  return {
    isProcessing,
    progress,
    transcription,
    utterances,
    currentWordIndex,
    startFromMicrophone,
    startFromFile,
    stopTranscription,
    updateHighlight
  };
}
