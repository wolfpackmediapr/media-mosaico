
import { useState } from "react";
import { NewsSegment } from "@/hooks/use-video-processor";

export const useSegmentsState = (
  segments: NewsSegment[],
  onSegmentsChange: (segments: NewsSegment[]) => void
) => {
  const [expandedView, setExpandedView] = useState(false);
  const [sortOrder, setSortOrder] = useState<'chronological' | 'reverse' | 'importance'>('chronological');
  const [filterEmpty, setFilterEmpty] = useState(false);

  const handleSegmentEdit = (index: number, text: string) => {
    const updatedSegments = [...segments];
    updatedSegments[index] = {
      ...updatedSegments[index],
      text
    };
    onSegmentsChange(updatedSegments);
  };

  const addEmptySegment = () => {
    const maxSegmentNumber = segments.length > 0 
      ? Math.max(...segments.map(s => s.segment_number || 0)) + 1 
      : 1;
      
    const newSegment: NewsSegment = {
      headline: `Segmento ${maxSegmentNumber}`,
      text: "",
      start: 0,
      end: 0,
      segment_number: maxSegmentNumber,
      segment_title: `Segmento ${maxSegmentNumber}`,
      timestamp_start: "00:00:00",
      timestamp_end: "00:00:00"
    };
    onSegmentsChange([...segments, newSegment]);
  };

  const toggleView = () => {
    setExpandedView(!expandedView);
  };
  
  const handleSort = (order: 'chronological' | 'reverse' | 'importance') => {
    setSortOrder(order);
  };

  const toggleFilterEmpty = () => {
    setFilterEmpty(!filterEmpty);
  };

  // Create display segments array with placeholder segments
  const displaySegments = [...segments];
  while (displaySegments.length < 6) {
    const segmentNumber = displaySegments.length + 1;
    displaySegments.push({
      headline: `Segmento ${segmentNumber}`,
      text: "",
      start: 0,
      end: 0,
      segment_number: segmentNumber,
      segment_title: `Segmento ${segmentNumber}`,
      timestamp_start: "00:00:00",
      timestamp_end: "00:00:00"
    });
  }

  // Apply sorting
  const sortedSegments = [...displaySegments].sort((a, b) => {
    if (sortOrder === 'chronological') {
      return a.start - b.start;
    } else if (sortOrder === 'reverse') {
      return b.start - a.start;
    } else if (sortOrder === 'importance') {
      return a.segment_number - b.segment_number;
    }
    return 0;
  });

  // Apply filtering
  const filteredSegments = filterEmpty 
    ? sortedSegments.filter(segment => segment.text.trim() !== "")
    : sortedSegments;

  // Calculate visible segments based on view mode
  const visibleSegments = expandedView 
    ? filteredSegments 
    : filteredSegments.slice(0, Math.max(6, segments.filter(s => s.text.trim() !== "").length));

  return {
    expandedView,
    sortOrder,
    filterEmpty,
    handleSegmentEdit,
    addEmptySegment,
    toggleView,
    handleSort,
    toggleFilterEmpty,
    visibleSegments
  };
};
