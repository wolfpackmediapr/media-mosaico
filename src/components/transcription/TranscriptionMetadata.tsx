import { Badge } from "@/components/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Radio, Tag, Tv } from "lucide-react";

interface TranscriptionMetadataProps {
  metadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
    keywords?: string[];
  };
  isSaving?: boolean;
}

const TranscriptionMetadata = ({ metadata, isSaving }: TranscriptionMetadataProps) => {
  if (!metadata) return null;

  return (
    <CardHeader>
      <CardTitle>Transcripción Generada</CardTitle>
      <CardDescription>
        La transcripción del video aparecerá aquí una vez que se complete el proceso.
        {isSaving && <span className="text-primary ml-2">Guardando...</span>}
      </CardDescription>
      <div className="flex flex-wrap gap-2 mt-2">
        {metadata.channel && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Tv className="w-3 h-3" />
            {metadata.channel}
          </Badge>
        )}
        {metadata.program && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Radio className="w-3 h-3" />
            {metadata.program}
          </Badge>
        )}
        {metadata.broadcastTime && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(metadata.broadcastTime).toLocaleString('es-ES')}
          </Badge>
        )}
        {metadata.category && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {metadata.category}
          </Badge>
        )}
      </div>
      {metadata.keywords && metadata.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {metadata.keywords.map((keyword, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {keyword}
            </Badge>
          ))}
        </div>
      )}
    </CardHeader>
  );
};

export default TranscriptionMetadata;