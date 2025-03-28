
import { ProgramsTable } from "./ProgramsTable";
import { ProgramLoadingState, ProgramEmptyState } from "./ProgramStates";
import { ProgramsPagination } from "./ProgramsPagination";
import { ProgramStationFilter } from "./ProgramStationFilter";
import { ProgramType, StationType } from "@/services/radio/types";

interface ProgramsContentProps {
  loading: boolean;
  programs: ProgramType[];
  stations: StationType[];
  hasPrograms: boolean;
  filteredProgramsLength: number;
  selectedStationId: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onStationChange: (stationId: string) => void;
  onPageChange: (page: number) => void;
  onEditProgram: (program: ProgramType) => void;
  onDeleteProgram: (id: string) => void;
}

export function ProgramsContent({
  loading,
  programs,
  stations,
  hasPrograms,
  filteredProgramsLength,
  selectedStationId,
  currentPage,
  totalPages,
  itemsPerPage,
  onStationChange,
  onPageChange,
  onEditProgram,
  onDeleteProgram
}: ProgramsContentProps) {
  if (loading) {
    return <ProgramLoadingState />;
  }
  
  if (!hasPrograms) {
    return <ProgramEmptyState hasStations={stations.length > 0} />;
  }

  return (
    <>
      <ProgramStationFilter 
        stations={stations}
        selectedStationId={selectedStationId}
        onStationChange={onStationChange}
      />
      
      <div className="mt-4">
        <ProgramsTable 
          programs={programs} 
          stations={stations}
          onEdit={onEditProgram}
          onDelete={onDeleteProgram}
        />
      </div>
      
      {filteredProgramsLength > itemsPerPage && (
        <div className="mt-4">
          <ProgramsPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
      
      <p className="text-xs text-muted-foreground mt-2">
        {filteredProgramsLength > 0 && (
          `Mostrando ${(currentPage - 1) * itemsPerPage + 1} a ${Math.min(currentPage * itemsPerPage, filteredProgramsLength)} de ${filteredProgramsLength} programas`
        )}
      </p>
    </>
  );
}
