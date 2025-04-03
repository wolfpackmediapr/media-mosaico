
import React from "react";
import { RateType, MediaType, ProgramType } from "@/hooks/common/useRatesManagement";

export interface RatesContentProps<
  R extends RateType,
  M extends MediaType,
  P extends ProgramType
> {
  isLoading: boolean;
  searchTerm: string;
  selectedMedia: string;
  selectedProgram: string;
  onSearchChange: (term: string) => void;
  onMediaChange: (mediaId: string) => void;
  onProgramChange: (programId: string) => void;
  onShowAll: () => void;
  isAddingNew: boolean;
  onAddRate: (rateData: Omit<R, 'id' | 'created_at'>) => Promise<void>;
  onCancelAdd: () => void;
  filteredRates: R[];
  totalRates: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rateData: Omit<R, 'created_at'>) => Promise<void>;
  onCancelEdit: () => void;
  editingId: string | null;
  media: M[];
  programs: P[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onImportClick: () => void;
  
  // Components to render - these will be different for TV and Radio
  HeaderComponent: React.ComponentType<{
    onAddClick: () => void;
    onImportClick: () => void;
  }>;
  FilterComponent: React.ComponentType<{
    searchTerm: string;
    selectedMedia: string;
    selectedProgram: string;
    onSearchChange: (term: string) => void;
    onMediaChange: (mediaId: string) => void;
    onProgramChange: (programId: string) => void;
    onClearFilters: () => void;
    media: M[];
    programs: P[];
  }>;
  RateFormComponent: React.ComponentType<{
    media: M[];
    programs: P[];
    onSave: (rateData: any) => Promise<void>;
    onCancel: () => void;
    editMode?: boolean;
    data?: R;
  }>;
  TableComponent: React.ComponentType<{
    rates: R[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onSaveEdit: (rateData: any) => Promise<void>;
    onCancelEdit: () => void;
    editingId: string | null;
    [key: string]: any;
  }>;
  EmptyStateComponent: React.ComponentType<{
    onAddClick: () => void;
    [key: string]: any;
  }>;
}

export function RatesContent<
  R extends RateType,
  M extends MediaType,
  P extends ProgramType
>({
  isLoading,
  searchTerm,
  selectedMedia,
  selectedProgram,
  onSearchChange,
  onMediaChange,
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
  media,
  programs,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onImportClick,
  HeaderComponent,
  FilterComponent,
  RateFormComponent,
  TableComponent,
  EmptyStateComponent,
}: RatesContentProps<R, M, P>) {
  
  // Render empty state if there are no rates and we're not adding a new one
  if (totalRates === 0 && !isAddingNew) {
    return <EmptyStateComponent onAddClick={() => onEdit("")} />;
  }

  return (
    <div className="space-y-4">
      <HeaderComponent 
        onAddClick={() => {
          // Using isAddingNew instead of directly manipulating editingId
          if (!isAddingNew && !editingId) {
            onEdit("");
          }
        }} 
        onImportClick={onImportClick} 
      />
      
      <FilterComponent
        searchTerm={searchTerm}
        selectedMedia={selectedMedia}
        selectedProgram={selectedProgram}
        onSearchChange={onSearchChange}
        onMediaChange={onMediaChange}
        onProgramChange={onProgramChange}
        onClearFilters={onShowAll}
        media={media}
        programs={programs}
      />
      
      {isAddingNew && (
        <RateFormComponent
          media={media}
          programs={programs}
          onSave={onAddRate}
          onCancel={onCancelAdd}
        />
      )}
      
      <TableComponent
        rates={filteredRates}
        onEdit={onEdit}
        onDelete={onDelete}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        editingId={editingId}
      />
    </div>
  );
}
