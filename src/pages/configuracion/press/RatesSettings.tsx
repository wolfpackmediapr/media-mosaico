
import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Source } from "./types/press-types";
import { RatesTable } from "./components/RatesTable";
import { RatesSearch } from "./components/RatesSearch";
import { AddRateForm } from "./components/AddRateForm";
import { RatesPagination } from "./components/RatesPagination";
import { getInitialRates } from "./components/initialRates";

export function RatesSettings() {
  const [rates, setRates] = useState<Source[]>([]);
  const [filteredRates, setFilteredRates] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRateName, setNewRateName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Initial data - in a real app, this would come from the API
    const initialRates = getInitialRates();
    
    setRates(initialRates);
    setFilteredRates(initialRates);
    setIsLoading(false);
  }, []);

  // Filter rates based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredRates(rates);
    } else {
      const filtered = rates.filter(rate => 
        rate.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRates(filtered);
    }
    setCurrentPage(1); // Reset to first page on search
  }, [searchTerm, rates]);

  const handleAddRate = () => {
    if (!newRateName.trim()) {
      toast.error("El nombre de la tarifa no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    const newRate: Source = {
      id: Date.now().toString(),
      name: newRateName.trim().toUpperCase(),
    };

    setRates([...rates, newRate]);
    setNewRateName("");
    setIsAddingNew(false);
    toast.success("Tarifa añadida correctamente");
  };

  const handleEditRate = (id: string) => {
    const rate = rates.find(r => r.id === id);
    if (rate) {
      setEditingId(id);
      setEditedName(rate.name);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editedName.trim()) {
      toast.error("El nombre de la tarifa no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    setRates(rates.map(rate => 
      rate.id === id ? { ...rate, name: editedName.trim().toUpperCase() } : rate
    ));
    setEditingId(null);
    toast.success("Tarifa actualizada correctamente");
  };

  const handleDeleteRate = (id: string) => {
    // In a real app, this would call an API
    setRates(rates.filter(rate => rate.id !== id));
    toast.success("Tarifa eliminada correctamente");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewRateName("");
  };

  const handleShowAll = () => {
    setSearchTerm("");
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredRates.length / itemsPerPage);
  const paginatedRates = filteredRates.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-56">
          <p className="text-muted-foreground">Cargando tarifas...</p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Tarifas de Prensa</h3>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar tarifa
          </Button>
        )}
      </div>
      
      {/* Search section */}
      <RatesSearch 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleShowAll={handleShowAll}
      />
      
      {/* Add new rate form */}
      {isAddingNew && (
        <AddRateForm
          newRateName={newRateName}
          setNewRateName={setNewRateName}
          handleAddRate={handleAddRate}
          handleCancelAdd={handleCancelAdd}
        />
      )}

      {/* Rates table */}
      <RatesTable
        paginatedRates={paginatedRates}
        onEdit={handleEditRate}
        onDelete={handleDeleteRate}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        editingId={editingId}
        editedName={editedName}
        setEditedName={setEditedName}
      />
      
      {/* Pagination */}
      {filteredRates.length > 0 && (
        <RatesPagination
          currentPage={currentPage}
          totalPages={totalPages}
          filteredItemsCount={filteredRates.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </CardContent>
  );
}
