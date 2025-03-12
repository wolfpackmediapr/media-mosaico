
import { NewsSegment } from "@/hooks/use-video-processor";
import NewsSegmentCard from "../NewsSegmentCard";

interface SegmentsListProps {
  segments: NewsSegment[];
  visibleSegments: NewsSegment[];
  handleSegmentEdit: (index: number, text: string) => void;
  onSeek?: (timestamp: number) => void;
  isProcessing: boolean;
}

const SegmentsList = ({
  segments,
  visibleSegments,
  handleSegmentEdit,
  onSeek,
  isProcessing
}: SegmentsListProps) => {
  if (segments.length === 0 && !isProcessing) {
    return (
      <div className="text-center p-6 text-gray-500">
        <p>No se han detectado segmentos de noticias.</p>
        <p className="text-sm mt-2">Procesa un video para detectar automáticamente segmentos o añade uno manualmente.</p>
      </div>
    );
  }

  return (
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
  );
};

export default SegmentsList;
