
import { CardTitle } from "@/components/ui/card";
import SegmentControls from "./SegmentControls";

interface SegmentsHeaderProps {
  expandedView: boolean;
  filterEmpty: boolean;
  isProcessing: boolean;
  toggleView: () => void;
  toggleFilterEmpty: () => void;
  handleSort: (order: 'chronological' | 'reverse' | 'importance') => void;
  addEmptySegment: () => void;
}

const SegmentsHeader = ({
  expandedView,
  filterEmpty,
  isProcessing,
  toggleView,
  toggleFilterEmpty,
  handleSort,
  addEmptySegment
}: SegmentsHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <CardTitle className="text-2xl font-bold text-primary-900">
        Segmentos de Noticias
      </CardTitle>
      <SegmentControls
        expandedView={expandedView}
        filterEmpty={filterEmpty}
        isProcessing={isProcessing}
        toggleView={toggleView}
        toggleFilterEmpty={toggleFilterEmpty}
        handleSort={handleSort}
        addEmptySegment={addEmptySegment}
      />
    </div>
  );
};

export default SegmentsHeader;
