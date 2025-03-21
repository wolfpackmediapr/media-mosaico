
import { Button } from "@/components/ui/button";
import { MediaFilter } from "@/components/settings/media/MediaFilter";
import { ImportMediaButton } from "@/components/settings/media/ImportMediaButton";

interface MediaHeaderActionsProps {
  filterType: string;
  onFilterChange: (type: string) => void;
  showFilter: boolean;
  onToggleFilter: () => void;
  onImportComplete: () => void;
  onToggleAddForm: () => void;
  showAddForm: boolean;
  hasMediaOutlets: boolean;
  loading: boolean;
  csvData: string;
}

export function MediaHeaderActions({
  filterType,
  onFilterChange,
  showFilter,
  onToggleFilter,
  onImportComplete,
  onToggleAddForm,
  showAddForm,
  hasMediaOutlets,
  loading,
  csvData
}: MediaHeaderActionsProps) {
  return (
    <div className="flex gap-2">
      <MediaFilter 
        filterType={filterType}
        onFilterChange={onFilterChange}
        showFilter={showFilter}
        onToggleFilter={onToggleFilter}
      />
      <ImportMediaButton
        csvData={csvData}
        onImportComplete={onImportComplete}
        disabled={loading}
      />
      <Button 
        size="sm"
        onClick={onToggleAddForm}
      >
        {showAddForm ? 'Cancelar' : 'Añadir Medio'}
      </Button>
    </div>
  );
}
