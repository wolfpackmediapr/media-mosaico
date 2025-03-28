
import { RatesTable } from "@/pages/configuracion/press/components/RatesTable";
import { AddRateForm } from "@/pages/configuracion/press/components/AddRateForm";
import { RatesFilter } from "@/components/settings/press/rates/RatesFilter";
import { RatesEmptyState } from "@/components/settings/press/rates/RatesEmptyState";
import { RatesLoadingState } from "@/components/settings/press/rates/RatesLoadingState";
import { Source } from "@/pages/configuracion/press/types/press-types";

interface RatesContentProps {
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onShowAll: () => void;
  isAddingNew: boolean;
  newRateName: string;
  setNewRateName: (name: string) => void;
  onAddRate: () => void;
  onCancelAdd: () => void;
  paginatedRates: Source[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  editingId: string | null;
  editedName: string;
  setEditedName: (name: string) => void;
}

export function RatesContent({
  isLoading,
  searchTerm,
  onSearchChange,
  onShowAll,
  isAddingNew,
  newRateName,
  setNewRateName,
  onAddRate,
  onCancelAdd,
  paginatedRates,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editingId,
  editedName,
  setEditedName
}: RatesContentProps) {
  if (isLoading) {
    return <RatesLoadingState />;
  }

  return (
    <div className="space-y-4">
      {/* Search/filter section */}
      <RatesFilter 
        searchTerm={searchTerm}
        setSearchTerm={onSearchChange}
        handleShowAll={onShowAll}
      />
      
      {/* Add new rate form */}
      {isAddingNew && (
        <AddRateForm
          newRateName={newRateName}
          setNewRateName={setNewRateName}
          handleAddRate={onAddRate}
          handleCancelAdd={onCancelAdd}
        />
      )}

      {/* Rates table or empty state */}
      {paginatedRates.length === 0 ? (
        <RatesEmptyState 
          searchTerm={searchTerm} 
          onClearSearch={onShowAll} 
          onAddNew={() => setNewRateName("")}
        />
      ) : (
        <RatesTable
          paginatedRates={paginatedRates}
          onEdit={onEdit}
          onDelete={onDelete}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          editingId={editingId}
          editedName={editedName}
          setEditedName={setEditedName}
        />
      )}
    </div>
  );
}
