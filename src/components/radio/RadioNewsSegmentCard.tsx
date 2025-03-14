
import { useState } from "react";
import { Card, Car dContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Edit2, Save, Tag } from "lucide-react";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";

interface RadioNewsSegmentCardProps {
  segment: RadioNewsSegment;
  index: number;
  onEdit: (index: number, text: string) => void;
  onSeek?: (timestamp: number) => void;
  isReadOnly?: boolean;
}

const RadioNewsSegmentCard = ({ 
  segment, 
  index, 
  onEdit, 
  onSeek,
  isReadOnly = false
}: RadioNewsSegmentCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(segment.text);

  const formatTime = (milliseconds: number) => {
    if (!milliseconds && milliseconds !== 0) return "00:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleEdit = () => {
    if (isEditing) {
      onEdit(index, text);
    }
    setIsEditing(!isEditing);
  };

  const handleSeek = () => {
    if (onSeek && segment.start !== undefined) {
      onSeek(segment.start);
    }
  };

  return (
    <Card className={`mb-4 ${isReadOnly ? 'opacity-50' : ''} h-full flex flex-col`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {segment.headline || `Segmento ${index + 1}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEdit}
              >
                {isEditing ? <Save className="h-4 w-4 mr-1" /> : <Edit2 className="h-4 w-4 mr-1" />}
                {isEditing ? "Guardar" : "Editar"}
              </Button>
            )}
            {segment.start !== undefined && segment.start > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSeek}
                className="text-muted-foreground"
              >
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(segment.start)}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isEditing ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[120px] flex-1"
          />
        ) : (
          <div className="flex flex-col h-full">
            <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1 mb-3">
              {segment.text || "No hay análisis disponible para este segmento."}
            </p>
            {segment.keywords && segment.keywords.length > 0 && (
              <div className="mt-auto">
                <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold mb-1">
                  <Tag className="h-3 w-3" />
                  <span>Palabras clave:</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {segment.keywords.map((keyword, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RadioNewsSegmentCard;
