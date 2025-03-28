
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
  onAddRate: (rate: Omit<RadioRateType, 'id' | 'created_at'>) => void;
  onCancelAdd: () => void;
  paginatedRates: RadioRateType[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rate: RadioRateType) => void;
  onCancelEdit: () => void;
  editingId: string | null;
  stations: StationType[];
  programs: ProgramType[];
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
  paginatedRates,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editingId,
  stations,
  programs
}: RadioRatesContentProps) {
  if (isLoading) {
    return <RadioRatesLoadingState />;
  }

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <RadioRatesHeader onAddClick={() => onStationChange(selectedStation)} />
      
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
      {paginatedRates.length === 0 ? (
        <RadioRatesEmptyState 
          searchTerm={searchTerm} 
          selectedStation={selectedStation}
          selectedProgram={selectedProgram}
          onClearSearch={onShowAll} 
          onAddNew={() => onStationChange(selectedStation)}
        />
      ) : (
        <RadioRatesTable
          rates={paginatedRates}
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
