
import { RatesContent } from "@/components/settings/common/rates/RatesContent";
import { RadioRatesTable } from "./RadioRatesTable";
import { RadioRateForm } from "./RadioRateForm";
import { RadioRatesFilter } from "./RadioRatesFilter";
import { RadioRatesEmptyState } from "./RadioRatesEmptyState";
import { RadioRatesHeader } from "./RadioRatesHeader";
import { RadioRateType, StationType, ProgramType } from "@/services/radio/types";
import React from "react";

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
  onAddRate: (rate: Omit<RadioRateType, 'id' | 'created_at' | 'station_name' | 'program_name'>) => Promise<void>;
  onCancelAdd: () => void;
  filteredRates: RadioRateType[];
  totalRates: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rate: Omit<RadioRateType, 'created_at' | 'station_name' | 'program_name'>) => Promise<void>;
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

export function RadioRatesContent(props: RadioRatesContentProps) {
  // Adapter for the RadioRatesFilter component
  const FilterAdapter = ({ 
    searchTerm, 
    selectedMedia, 
    selectedProgram, 
    onSearchChange, 
    onMediaChange, 
    onProgramChange, 
    onClearFilters, 
    media, 
    programs 
  }: any) => (
    <RadioRatesFilter 
      searchTerm={searchTerm}
      setSearchTerm={onSearchChange}
      selectedStation={selectedMedia}
      setSelectedStation={onMediaChange}
      selectedProgram={selectedProgram}
      setSelectedProgram={onProgramChange}
      stations={media}
      programs={programs}
      handleShowAll={onClearFilters}
    />
  );

  // Adapter for the RadioRatesEmptyState component
  const EmptyStateAdapter = ({ onAddClick, ...rest }: any) => (
    <RadioRatesEmptyState 
      searchTerm={props.searchTerm}
      selectedStation={props.selectedStation}
      selectedProgram={props.selectedProgram}
      onClearSearch={props.onShowAll}
      onAddNew={onAddClick}
    />
  );

  // Adapter for the RadioRateForm component
  const RadioRateFormAdapter = ({ 
    media, 
    programs, 
    onSave, 
    onCancel, 
    editMode, 
    data 
  }: any) => (
    <RadioRateForm
      stations={media}
      programs={programs}
      onSave={onSave}
      onCancel={onCancel}
      editMode={editMode}
      data={data}
    />
  );

  // Use a variable to properly type the generic component
  const RatesContentComponent = RatesContent<RadioRateType, StationType, ProgramType>;

  return (
    <RatesContentComponent
      {...props}
      selectedMedia={props.selectedStation}
      onMediaChange={props.onStationChange}
      media={props.stations}
      HeaderComponent={RadioRatesHeader}
      FilterComponent={FilterAdapter}
      RateFormComponent={RadioRateFormAdapter}
      TableComponent={RadioRatesTable}
      EmptyStateComponent={EmptyStateAdapter}
    />
  );
}
