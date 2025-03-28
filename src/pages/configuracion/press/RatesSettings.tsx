
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardFooter
} from "@/components/ui/card";
import { RatesHeader } from "@/components/settings/press/rates/RatesHeader";
import { RatesContent } from "@/components/settings/press/rates/RatesContent";
import { RatesFooter } from "@/components/settings/press/rates/RatesFooter";
import { useRatesManagement } from "@/hooks/press/useRatesManagement";

export function RatesSettings() {
  const {
    isLoading,
    searchTerm,
    isAddingNew,
    newRateName,
    editingId,
    editedName,
    paginatedRates,
    currentPage,
    totalPages,
    filteredRates,
    itemsPerPage,
    setSearchTerm,
    setIsAddingNew,
    setNewRateName,
    setEditedName,
    setCurrentPage,
    setEditingId,
    handleAddRate,
    handleEditRate,
    handleSaveEdit,
    handleDeleteRate,
    loadData
  } = useRatesManagement();

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleShowAll = () => {
    setSearchTerm("");
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewRateName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <RatesHeader onAddClick={() => setIsAddingNew(true)} />
      </CardHeader>
      
      <CardContent>
        <RatesContent
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onShowAll={handleShowAll}
          isAddingNew={isAddingNew}
          newRateName={newRateName}
          setNewRateName={setNewRateName}
          onAddRate={handleAddRate}
          onCancelAdd={handleCancelAdd}
          paginatedRates={paginatedRates}
          onEdit={handleEditRate}
          onDelete={handleDeleteRate}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          editingId={editingId}
          editedName={editedName}
          setEditedName={setEditedName}
        />
      </CardContent>
      
      <CardFooter>
        <RatesFooter
          onRefresh={loadData}
          isLoading={isLoading}
          totalCount={filteredRates.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </CardFooter>
    </Card>
  );
}
