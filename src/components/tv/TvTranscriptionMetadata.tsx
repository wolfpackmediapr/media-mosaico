import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Monitor, Radio, Clock } from "lucide-react";

interface TvTranscriptionMetadataProps {
  metadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
    keywords?: string[];
  };
  onMetadataChange?: (metadata: {
    channel: string;
    program: string;
    category: string;
    broadcastTime: string;
  }) => void;
}

const TvTranscriptionMetadata: React.FC<TvTranscriptionMetadataProps> = ({
  metadata,
  onMetadataChange,
}) => {
  return (
    <CardHeader className="bg-muted/30 border-b">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          Transcripción TV
        </CardTitle>
        
        <div className="flex flex-wrap gap-2">
          {metadata?.channel && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Radio className="h-3 w-3" />
              {metadata.channel}
            </Badge>
          )}
          
          {metadata?.program && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              {metadata.program}
            </Badge>
          )}
          
          {metadata?.category && (
            <Badge variant="secondary">
              {metadata.category}
            </Badge>
          )}
          
          {metadata?.broadcastTime && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(metadata.broadcastTime).toLocaleString()}
            </Badge>
          )}
        </div>
      </div>

      {metadata?.keywords && metadata.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {metadata.keywords.map((keyword, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {keyword}
            </Badge>
          ))}
        </div>
      )}
    </CardHeader>
  );
};

export default TvTranscriptionMetadata;