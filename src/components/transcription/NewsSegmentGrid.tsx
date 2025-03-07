
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NewsSegment } from "@/hooks/use-video-processor";
import TranscriptionEditor from "./TranscriptionEditor";

interface NewsSegmentGridProps {
  segments: NewsSegment[];
  isProcessing: boolean;
  onSegmentChange: (index: number, updatedText: string) => void;
}

const NewsSegmentGrid = ({
  segments,
  isProcessing,
  onSegmentChange,
}: NewsSegmentGridProps) => {
  const [currentSegment, setCurrentSegment] = useState(0);

  // Add console log to see segments
  console.log("Segments in NewsSegmentGrid:", segments);

  const handleNext = () => {
    if (currentSegment < segments.length - 1) {
      setCurrentSegment(currentSegment + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSegment > 0) {
      setCurrentSegment(currentSegment - 1);
    }
  };

  const handleSegmentTextChange = (text: string) => {
    onSegmentChange(currentSegment, text);
  };

  if (!segments.length) {
    return (
      <Card className="mb-4">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No se han detectado segmentos de noticias.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {segments.length} segmentos detectados
        </p>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            Segmento {currentSegment + 1} de {segments.length}
          </span>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentSegment === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentSegment === segments.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="overflow-hidden border-primary/20">
          <div className="bg-primary/5 border-b border-primary/10 px-4 py-3">
            <h3 className="font-medium text-primary-foreground">
              {segments[currentSegment].title || `Segmento ${currentSegment + 1}`}
            </h3>
            {segments[currentSegment].category && (
              <p className="text-xs text-muted-foreground mt-1">
                Categoría: {segments[currentSegment].category}
              </p>
            )}
          </div>
          <CardContent className="p-4">
            <TranscriptionEditor
              transcriptionText={segments[currentSegment].text}
              isProcessing={isProcessing}
              onTranscriptionChange={handleSegmentTextChange}
            />
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex space-x-2 w-max">
          {segments.map((segment, index) => (
            <Button
              key={index}
              variant={currentSegment === index ? "default" : "outline"}
              className="h-8 px-3"
              onClick={() => setCurrentSegment(index)}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsSegmentGrid;
