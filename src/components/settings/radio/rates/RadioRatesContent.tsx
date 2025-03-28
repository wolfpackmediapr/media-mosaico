
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
  filteredRates: RadioRateType[]; // Changed from paginatedRates to filteredRates
  totalRates: number; // Add total count
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rate: RadioRateType) => void;
  onCancelEdit: () => void;
  editingId: string | null;
  stations: StationType[];
  programs: ProgramType[];
  currentPage: number; // Add current page
  totalPages: number; // Add total pages
  onPageChange: (page: number) => void; // Add page change handler
  itemsPerPage: number; // Add items per page
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
  filteredRates, // Changed from paginatedRates to filteredRates
  totalRates, // Add total count
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editingId,
  stations,
  programs,
  currentPage, // Add current page
  totalPages, // Add total pages
  onPageChange, // Add page change handler
  itemsPerPage // Add items per page
}: RadioRatesContentProps) {
  if (isLoading) {
    return <RadioRatesLoadingState />;
  }

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <RadioRatesHeader onAddClick={() => {
        // Check if a station is selected for better UX
        if (selectedStation !== 'all') {
          onStationChange(selectedStation);
        }
      }} />
      
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
            // Check if a station is selected for better UX
            if (selectedStation !== 'all') {
              onStationChange(selectedStation);
            }
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
