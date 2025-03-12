
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NewsSegment } from "@/hooks/use-video-processor";
import { useSegmentsState } from "./news-segments/useSegmentsState";
import SegmentsHeader from "./news-segments/SegmentsHeader";
import SegmentsList from "./news-segments/SegmentsList";

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
  const {
    expandedView,
    filterEmpty,
    handleSegmentEdit,
    addEmptySegment,
    toggleView,
    handleSort,
    toggleFilterEmpty,
    visibleSegments
  } = useSegmentsState(segments, onSegmentsChange);

  return (
    <Card className="my-6">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <SegmentsHeader 
          expandedView={expandedView}
          filterEmpty={filterEmpty}
          isProcessing={isProcessing}
          toggleView={toggleView}
          toggleFilterEmpty={toggleFilterEmpty}
          handleSort={handleSort}
          addEmptySegment={addEmptySegment}
        />
      </CardHeader>
      <CardContent>
        <SegmentsList 
          segments={segments}
          visibleSegments={visibleSegments}
          handleSegmentEdit={handleSegmentEdit}
          onSeek={onSeek}
          isProcessing={isProcessing}
        />
      </CardContent>
    </Card>
  );
};

export default NewsSegmentsContainer;
