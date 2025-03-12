
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Filter, SortAsc } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface SegmentControlsProps {
  expandedView: boolean;
  filterEmpty: boolean;
  isProcessing: boolean;
  toggleView: () => void;
  toggleFilterEmpty: () => void;
  handleSort: (order: 'chronological' | 'reverse' | 'importance') => void;
  addEmptySegment: () => void;
}

const SegmentControls = ({
  expandedView,
  filterEmpty,
  isProcessing,
  toggleView,
  toggleFilterEmpty,
  handleSort,
  addEmptySegment
}: SegmentControlsProps) => {
  return (
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
  );
};

export default SegmentControls;
