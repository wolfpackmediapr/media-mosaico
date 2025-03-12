
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewsSegment } from "@/hooks/use-video-processor";
import NewsSegmentCard from "./NewsSegmentCard";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface NewsSegmentsContainerProps {
  segments: NewsSegment[];
  onSegmentsChange: (segments: NewsSegment[]) => void;
  onSeek?: (timestamp: number) => void;
  isProcessing: boolean;
}

const NewsSegmentsContainer = ({
  segments,
  onSegmentsChange,
  onSeek,
  isProcessing
}: NewsSegmentsContainerProps) => {
  const [expandedView, setExpandedView] = useState(false);

  const handleSegmentEdit = (index: number, text: string) => {
    const updatedSegments = [...segments];
    updatedSegments[index] = {
      ...updatedSegments[index],
      text
    };
    onSegmentsChange(updatedSegments);
  };

  const addEmptySegment = () => {
    const newSegment: NewsSegment = {
      headline: `Segmento ${segments.length + 1}`,
      text: "",
      start: 0,
      end: 0
    };
    onSegmentsChange([...segments, newSegment]);
  };

  const toggleView = () => {
    setExpandedView(!expandedView);
  };

  // Create an array of exactly 6 segment slots
  // For slots with actual segments, use the real segment data
  // For empty slots, use placeholder data
  const displaySegments = Array(6).fill(null).map((_, i) => {
    if (i < segments.length) {
      return segments[i];
    }
    return {
      headline: `Segmento ${i + 1}`,
      text: "",
      start: 0,
      end: 0
    };
  });

  // For expanded view, show all real segments plus empty placeholders if needed
  // For collapsed view, show exactly 6 slots (a mix of real and placeholder segments)
  const visibleSegments = expandedView 
    ? segments.length > 6 
      ? segments 
      : displaySegments
    : displaySegments;

  return (
    <Card className="my-6">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold text-primary-900">
            Segmentos de Noticias
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleView}
            >
              {expandedView ? "Ver menos" : "Ver todos"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={addEmptySegment}
              disabled={isProcessing}
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir segmento
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {segments.length === 0 && !isProcessing ? (
          <div className="text-center p-6 text-gray-500">
            <p>No se han detectado segmentos de noticias.</p>
            <p className="text-sm mt-2">Procesa un video para detectar automáticamente segmentos o añade uno manualmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSegments.map((segment, index) => (
              <NewsSegmentCard
                key={index}
                segment={segment}
                index={index}
                onEdit={handleSegmentEdit}
                onSeek={onSeek}
                isReadOnly={index >= segments.length}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsSegmentsContainer;
