
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RadioNewsSegmentCard from "./RadioNewsSegmentCard";

export interface RadioNewsSegment {
  headline: string;
  text: string;
  startTime: number;
  end: number;
  keywords?: string[];
}

interface RadioNewsSegmentsContainerProps {
  segments: RadioNewsSegment[];
  onSegmentsChange: (segments: RadioNewsSegment[]) => void;
  onSeek?: (segment: RadioNewsSegment) => void;
  isProcessing: boolean;
  forceReset?: boolean; // Add this prop to fix type error
}

const RadioNewsSegmentsContainer = ({
  segments,
  onSegmentsChange,
  onSeek,
  isProcessing,
  forceReset
}: RadioNewsSegmentsContainerProps) => {
  const [expandedView, setExpandedView] = useState(false);

  // Add an effect to handle force reset
  useEffect(() => {
    if (forceReset && segments.length > 0) {
      console.log('[RadioNewsSegmentsContainer] Force reset detected, clearing segments');
      onSegmentsChange([]);
    }
  }, [forceReset, segments.length, onSegmentsChange]);

  const handleSegmentEdit = (index: number, text: string) => {
    const updatedSegments = [...segments];
    if (index < updatedSegments.length) {
      updatedSegments[index] = {
        ...updatedSegments[index],
        text
      };
      onSegmentsChange(updatedSegments);
    }
  };

  const addEmptySegment = () => {
    const newSegment: RadioNewsSegment = {
      headline: `Nuevo Segmento ${segments.length + 1}`,
      text: "",
      startTime: 0,
      end: 0,
      keywords: []
    };
    onSegmentsChange([...segments, newSegment]);
  };

  const toggleView = () => {
    setExpandedView(!expandedView);
  };

  // Create placeholder segments to fill up to 6 slots total
  const placeholderSegments = Array(Math.max(0, 6 - segments.length))
    .fill(null)
    .map((_, i) => ({
      headline: `Segmento ${segments.length + i + 1}`,
      text: "",
      startTime: 0,
      end: 0,
      keywords: []
    }));

  // For expanded view, show all real segments
  // For collapsed view, show only up to 6 segments (real + placeholders if needed)
  const visibleSegments = expandedView && segments.length > 6
    ? segments
    : [...segments, ...placeholderSegments].slice(0, 6);

  return (
    <Card className="my-6">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold text-primary-900">
            Segmentos de Radio
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleView}
              disabled={segments.length <= 6}
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
            <p>No se han detectado segmentos de radio.</p>
            <p className="text-sm mt-2">Analiza la transcripción para detectar automáticamente segmentos o añade uno manualmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSegments.map((segment, index) => (
              <RadioNewsSegmentCard
                key={index}
                segment={segment}
                index={index}
                onEdit={handleSegmentEdit}
                onSeek={onSeek ? () => onSeek(segment) : undefined}
                isReadOnly={index >= segments.length}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RadioNewsSegmentsContainer;
