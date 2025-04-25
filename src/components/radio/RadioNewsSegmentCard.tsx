import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Edit2, Save, Play, X } from "lucide-react";
import { RadioNewsSegment } from "./RadioNewsSegmentsContainer";

interface RadioNewsSegmentCardProps {
  segment: RadioNewsSegment;
  index: number;
  onEdit?: (index: number, text: string) => void;
  onSeek?: (segment: RadioNewsSegment) => void;
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
  const [editText, setEditText] = useState(segment.text);

  const handleEditToggle = () => {
    if (isEditing && onEdit) {
      onEdit(index, editText);
    }
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setEditText(segment.text);
    setIsEditing(false);
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`overflow-hidden ${isReadOnly ? 'opacity-70' : ''}`}>
      <CardHeader className="bg-muted py-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md font-bold truncate">
            {segment.headline}
          </CardTitle>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-3 h-3" />
            <span>
              {formatTime(segment.startTime)} - {formatTime(segment.end)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-3">
        {isEditing ? (
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[120px] text-sm"
          />
        ) : (
          <div className="text-sm max-h-[150px] overflow-y-auto">
            {segment.text.length > 300 ? (
              <>{segment.text.substring(0, 300)}... <span className="text-primary cursor-pointer">(ver más)</span></>
            ) : (
              segment.text
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 pb-3 flex-col items-start gap-3">
        {segment.keywords && segment.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {segment.keywords.map((keyword, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex justify-between w-full">
          {!isReadOnly && (
            <div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleEditToggle}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Guardar
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditToggle}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          )}
          
          {onSeek && !isReadOnly && (
            <Button
              size="sm"
              variant="secondary"
              className="ml-auto"
              onClick={() => onSeek(segment)}
            >
              <Play className="h-4 w-4 mr-1" />
              Reproducir
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default RadioNewsSegmentCard;
