
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Edit2, Save } from "lucide-react";
import { NewsSegment } from "@/hooks/use-video-processor";

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

  const formatTime = (milliseconds: number) => {
    if (!milliseconds) return "00:00";
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
    if (onSeek && segment.start) {
      onSeek(segment.start);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
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
            {segment.start > 0 && (
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
      <CardContent>
        {isEditing ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px]"
          />
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{segment.text}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsSegmentCard;
