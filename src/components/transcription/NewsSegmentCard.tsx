
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Edit2, Save, PlayCircle } from "lucide-react";
import { NewsSegment } from "@/hooks/use-video-processor";
import { Badge } from "@/components/ui/badge";

interface NewsSegmentCardProps {
  segment: NewsSegment;
  index: number;
  onEdit: (index: number, text: string) => void;
  onSeek?: (timestamp: number) => void;
  isReadOnly?: boolean;
}

const NewsSegmentCard = ({ 
  segment, 
  index, 
  onEdit, 
  onSeek,
  isReadOnly = false
}: NewsSegmentCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(segment.text);

  const formatTime = (timeString: string) => {
    if (!timeString || timeString === "00:00:00" || timeString === "00:00") return "00:00";
    return timeString;
  };

  const handleEdit = () => {
    if (isEditing) {
      onEdit(index, text);
    }
    setIsEditing(!isEditing);
  };

  const handleSeek = () => {
    if (onSeek && segment.start) {
      onSeek(segment.start);
    }
  };

  // Check if the segment has meaningful content
  const hasContent = segment.text.trim().length > 0;
  const hasTimestamp = segment.timestamp_start !== "00:00:00" && segment.timestamp_start !== "00:00";

  return (
    <Card className={`mb-4 h-full flex flex-col ${!hasContent && !isEditing ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold line-clamp-1">
            {segment.segment_title || segment.headline || `Segmento ${segment.segment_number || index + 1}`}
          </CardTitle>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center">
            {!isEditing && hasTimestamp && (
              <Badge variant="outline" className="text-xs cursor-pointer" onClick={handleSeek}>
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(segment.timestamp_start)} - {formatTime(segment.timestamp_end)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {isEditing ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px] h-full"
          />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {segment.text.trim() || (
              <span className="text-gray-400 italic">
                No hay contenido en este segmento. Haga clic en "Editar" para agregar texto.
              </span>
            )}
          </p>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        {!isReadOnly && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleEdit}
            className="w-full"
          >
            {isEditing ? <Save className="h-4 w-4 mr-1" /> : <Edit2 className="h-4 w-4 mr-1" />}
            {isEditing ? "Guardar" : "Editar"}
          </Button>
        )}
        {hasTimestamp && !isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeek}
            className="ml-2"
          >
            <PlayCircle className="h-4 w-4 mr-1" />
            Reproducir
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default NewsSegmentCard;
