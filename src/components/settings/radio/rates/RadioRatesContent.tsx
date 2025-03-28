
import { RadioRatesTable } from "./RadioRatesTable";
import { RadioRateForm } from "./RadioRateForm";
import { RadioRatesFilter } from "./RadioRatesFilter";
import { RadioRatesEmptyState } from "./RadioRatesEmptyState";
import { RadioRatesLoadingState } from "./RadioRatesLoadingState";
import { RadioRatesHeader } from "./RadioRatesHeader";
import { RadioRateType, StationType, ProgramType } from "@/services/radio/types";

interface RadioRatesContentProps {
  isLoading: boolean;
  searchTerm: string;
  selectedStation: string;
  selectedProgram: string;
  onSearchChange: (term: string) => void;
  onStationChange: (stationId: string) => void;
  onProgramChange: (programId: string) => void;
  onShowAll: () => void;
  isAddingNew: boolean;
  onAddRate: (rate: Omit<RadioRateType, 'id' | 'created_at' | 'station_name' | 'program_name'>) => void;
  onCancelAdd: () => void;
  filteredRates: RadioRateType[];
  totalRates: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rate: RadioRateType) => void;
  onCancelEdit: () => void;
  editingId: string | null;
  stations: StationType[];
  programs: ProgramType[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onImportClick: () => void;
}

export function RadioRatesContent({
  isLoading,
  searchTerm,
  selectedStation,
  selectedProgram,
  onSearchChange,
  onStationChange,
  onProgramChange,
  onShowAll,
  isAddingNew,
  onAddRate,
  onCancelAdd,
  filteredRates,
  totalRates,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editingId,
  stations,
  programs,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onImportClick
}: RadioRatesContentProps) {
  if (isLoading) {
    return <RadioRatesLoadingState />;
  }

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <RadioRatesHeader 
        onAddClick={() => {
          // Using isAddingNew instead of directly manipulating editingId
          if (!isAddingNew && !editingId) {
            onEdit("");
          }
        }} 
        onImportClick={onImportClick}
      />
      
      {/* Filter section */}
      <RadioRatesFilter 
        searchTerm={searchTerm}
        setSearchTerm={onSearchChange}
        selectedStation={selectedStation}
        setSelectedStation={onStationChange}
        selectedProgram={selectedProgram}
        setSelectedProgram={onProgramChange}
        stations={stations}
        programs={programs}
        handleShowAll={onShowAll}
      />
      
      {/* Add new rate form */}
      {isAddingNew && (
        <RadioRateForm
          stations={stations}
          programs={programs}
          onCancel={onCancelAdd}
          onSubmit={onAddRate}
        />
      )}

      {/* Rates table or empty state */}
      {filteredRates.length === 0 ? (
        <RadioRatesEmptyState 
          searchTerm={searchTerm} 
          selectedStation={selectedStation}
          selectedProgram={selectedProgram}
          onClearSearch={onShowAll} 
          onAddNew={() => {
            // For adding new, call onEdit with empty string
            onEdit("");
          }}
        />
      ) : (
        <RadioRatesTable
          rates={filteredRates}
          onEdit={onEdit}
          onDelete={onDelete}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          editingId={editingId}
        />
      )}
    </div>
  );
}
