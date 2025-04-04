
import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RatesTable } from "./components/RatesTable";
import { AddRateForm } from "./components/AddRateForm";
import { usePressSettings } from "@/hooks/use-press-settings";

export function RatesSettings() {
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [newRateName, setNewRateName] = useState("");
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  
  const { 
    rates, 
    loadingRates, 
    addRate, 
    updateRate, 
    removeRate 
  } = usePressSettings();
  
  const handleAddRate = async () => {
    if (!newRateName.trim()) return;
    
    const success = await addRate(newRateName);
    if (success) {
      setNewRateName("");
      setIsAddingRate(false);
    }
  };
  
  const handleUpdateRate = async (id: string, name: string) => {
    await updateRate(id, name);
    setEditingRateId(null);
  };
  
  const handleDeleteRate = async (id: string) => {
    await removeRate(id);
  };
  
  const handleCancelAdd = () => {
    setNewRateName("");
    setIsAddingRate(false);
  };

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Tarifas de Prensa</h3>
        
        {!isAddingRate && (
          <Button onClick={() => setIsAddingRate(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Tarifa
          </Button>
        )}
      </div>
      
      {isAddingRate && (
        <AddRateForm
          newRateName={newRateName}
          setNewRateName={setNewRateName}
          handleAddRate={handleAddRate}
          handleCancelAdd={handleCancelAdd}
        />
      )}
      
      <RatesTable
        rates={rates}
        loading={loadingRates}
        onEdit={(id) => {
          const rate = rates.find(r => r.id === id);
          if (rate) setEditingRateId(id);
        }}
        onDelete={handleDeleteRate}
        editingId={editingRateId}
        setEditingId={setEditingRateId}
      />
    </CardContent>
  );
}
