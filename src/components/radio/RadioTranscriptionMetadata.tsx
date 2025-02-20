
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Clock, Tag } from "lucide-react";

interface RadioTranscriptionMetadataProps {
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
  };
  isSaving?: boolean;
}

const RadioTranscriptionMetadata = ({ metadata, isSaving }: RadioTranscriptionMetadataProps) => {
  if (!metadata) return null;

  return (
    <CardHeader>
      <CardTitle>Transcripción de Radio</CardTitle>
      <CardDescription>
        La transcripción del audio aparecerá aquí una vez que se complete el proceso.
        {isSaving && <span className="text-primary ml-2">Guardando...</span>}
      </CardDescription>
      <div className="flex flex-wrap gap-2 mt-2">
        {metadata.emisora && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Radio className="w-3 h-3" />
            {metadata.emisora}
          </Badge>
        )}
        {metadata.programa && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Radio className="w-3 h-3" />
            {metadata.programa}
          </Badge>
        )}
        {metadata.horario && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {metadata.horario}
          </Badge>
        )}
        {metadata.categoria && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {metadata.categoria}
          </Badge>
        )}
      </div>
    </CardHeader>
  );
};

export default RadioTranscriptionMetadata;
