import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewsSegment } from "@/hooks/use-video-processor";
import NewsSegmentCard from "./NewsSegmentCard";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Filter, SortAsc } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

  const filteredSegments = filterEmpty 
    ? sortedSegments.filter(segment => segment.text.trim() !== "")
    : sortedSegments;

  const visibleSegments = expandedView 
    ? filteredSegments 
    : filteredSegments.slice(0, Math.max(6, segments.filter(s => s.text.trim() !== "").length));

  return (
    <Card className="my-6">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl font-bold text-primary-900">
            Segmentos de Noticias
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filtrar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={toggleFilterEmpty}>
                  {filterEmpty ? "Mostrar todos" : "Ocultar vacíos"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                >
                  <SortAsc className="h-4 w-4 mr-1" />
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleSort('chronological')}>
                  Cronológico
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('reverse')}>
                  Inverso
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('importance')}>
                  Por importancia
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleView}
            >
              {expandedView ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Ver todos
                </>
              )}
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
