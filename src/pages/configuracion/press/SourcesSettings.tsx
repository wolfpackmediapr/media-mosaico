
import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SourcesTable } from "./components/SourcesTable";
import { AddSourceForm } from "./components/AddSourceForm";
import { usePressSettings } from "@/hooks/use-press-settings";

export function SourcesSettings() {
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  
  const { 
    sources, 
    loadingSources, 
    addSource, 
    updateSource, 
    removeSource 
  } = usePressSettings();
  
  const handleAddSource = async () => {
    if (!newSourceName.trim()) return;
    
    const success = await addSource(newSourceName);
    if (success) {
      setNewSourceName("");
      setIsAddingSource(false);
    }
  };
  
  const handleUpdateSource = async (id: string, name: string) => {
    await updateSource(id, name);
    setEditingSourceId(null);
  };
  
  const handleDeleteSource = async (id: string) => {
    await removeSource(id);
  };
  
  const handleCancelAdd = () => {
    setNewSourceName("");
    setIsAddingSource(false);
  };

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Fuentes de Prensa</h3>
        
        {!isAddingSource && (
          <Button onClick={() => setIsAddingSource(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Fuente
          </Button>
        )}
      </div>
      
      {isAddingSource && (
        <AddSourceForm
          newSourceName={newSourceName}
          setNewSourceName={setNewSourceName}
          handleAddSource={handleAddSource}
          handleCancelAdd={handleCancelAdd}
        />
      )}
      
      <SourcesTable
        sources={sources}
        loading={loadingSources}
        onEdit={(id) => {
          const source = sources.find(s => s.id === id);
          if (source) setEditingSourceId(id);
        }}
        onDelete={handleDeleteSource}
        editingId={editingSourceId}
        setEditingId={setEditingSourceId}
      />
    </CardContent>
  );
}
