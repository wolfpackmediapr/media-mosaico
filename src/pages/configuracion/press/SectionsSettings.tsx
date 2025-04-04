
import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SectionsTable } from "./components/SectionsTable";
import { AddSectionForm } from "./components/AddSectionForm";
import { usePressSettings } from "@/hooks/use-press-settings";

export function SectionsSettings() {
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  
  const { 
    sections, 
    loadingSections, 
    addSection, 
    updateSection, 
    removeSection 
  } = usePressSettings();
  
  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    
    const success = await addSection(newSectionName);
    if (success) {
      setNewSectionName("");
      setIsAddingSection(false);
    }
  };
  
  const handleUpdateSection = async (id: string, name: string) => {
    await updateSection(id, name);
    setEditingSectionId(null);
  };
  
  const handleDeleteSection = async (id: string) => {
    await removeSection(id);
  };
  
  const handleCancelAdd = () => {
    setNewSectionName("");
    setIsAddingSection(false);
  };

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Secciones de Prensa</h3>
        
        {!isAddingSection && (
          <Button onClick={() => setIsAddingSection(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Sección
          </Button>
        )}
      </div>
      
      {isAddingSection && (
        <AddSectionForm
          newSectionName={newSectionName}
          setNewSectionName={setNewSectionName}
          handleAddSection={handleAddSection}
          handleCancelAdd={handleCancelAdd}
        />
      )}
      
      <SectionsTable
        sections={sections}
        loading={loadingSections}
        onEdit={(id) => {
          const section = sections.find(s => s.id === id);
          if (section) setEditingSectionId(id);
        }}
        onDelete={handleDeleteSection}
        editingId={editingSectionId}
        setEditingId={setEditingSectionId}
      />
    </CardContent>
  );
}
