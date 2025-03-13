
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TranscriptionEditor from "./TranscriptionEditor";
import TranscriptionMetadata from "./TranscriptionMetadata";
import TranscriptionAnalysis from "./TranscriptionAnalysis";
import SimilarNewsSearch from "./SimilarNewsSearch";
import { NewsSegment } from "@/hooks/use-video-processor";

interface TranscriptionMetadataType {
  channel?: string;
  program?: string;
  category?: string;
  broadcastTime?: string;
  keywords?: string[];
}

interface FiveWAnalysisType {
  quien?: string;
  que?: string;
  cuando?: string;
  donde?: string;
  porque?: string;
  summary?: string;
  alerts?: string[];
  keywords?: string[];
}

interface TranscriptionSlotProps {
  isProcessing?: boolean;
  transcriptionText?: string;
  metadata?: TranscriptionMetadataType;
  analysis?: FiveWAnalysisType;
  onTranscriptionChange?: (text: string) => void;
  onSegmentsReceived?: (segments: NewsSegment[]) => void;
}

const TranscriptionSlot = ({
  isProcessing = false,
  transcriptionText = "",
  metadata,
  analysis,
  onTranscriptionChange,
  onSegmentsReceived
}: TranscriptionSlotProps) => {
  const [similarSegments, setSimilarSegments] = useState<NewsSegment[]>([]);

  const handleSimilarSegmentsFound = (segments: NewsSegment[]) => {
    setSimilarSegments(segments);
    
    if (onSegmentsReceived) {
      // Optionally, pass to parent component
      onSegmentsReceived(segments);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <Tabs defaultValue="transcription">
        <TabsList className="flex w-full rounded-t-lg border-b">
          <TabsTrigger className="flex-1 rounded-none" value="transcription">
            Transcripción
          </TabsTrigger>
          <TabsTrigger className="flex-1 rounded-none" value="metadata">
            Metadata
          </TabsTrigger>
          <TabsTrigger className="flex-1 rounded-none" value="analysis">
            Análisis
          </TabsTrigger>
          <TabsTrigger className="flex-1 rounded-none" value="search">
            Búsqueda
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transcription" className="p-4">
          <TranscriptionEditor
            transcriptionText={transcriptionText}
            isProcessing={isProcessing}
            onTranscriptionChange={onTranscriptionChange || (() => {})}
          />
        </TabsContent>
        
        <TabsContent value="metadata" className="p-4">
          <TranscriptionMetadata metadata={metadata} />
        </TabsContent>
        
        <TabsContent value="analysis" className="p-4">
          <TranscriptionAnalysis 
            transcriptionText={transcriptionText} 
            onSegmentsReceived={onSegmentsReceived}
          />
        </TabsContent>
        
        <TabsContent value="search" className="p-4">
          <SimilarNewsSearch onSimilarSegmentsFound={handleSimilarSegmentsFound} />
          
          {similarSegments.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Segmentos similares encontrados:</h3>
              <div className="space-y-4">
                {similarSegments.map((segment, index) => (
                  <div key={index} className="border p-4 rounded-lg">
                    <div className="flex justify-between">
                      <h4 className="font-medium">{segment.headline}</h4>
                      {segment.similarity !== undefined && (
                        <span className="text-sm bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                          Similitud: {segment.similarity.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{segment.text}</p>
                    {segment.keywords && segment.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {segment.keywords.map((keyword, kidx) => (
                          <span 
                            key={kidx}
                            className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TranscriptionSlot;
