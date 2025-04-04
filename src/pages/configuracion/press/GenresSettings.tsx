
import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GenresTable } from "./components/GenresTable";
import { AddGenreForm } from "./components/AddGenreForm";
import { usePressSettings } from "@/hooks/use-press-settings";

export function GenresSettings() {
  const [isAddingGenre, setIsAddingGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const [editingGenreId, setEditingGenreId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  
  const { 
    genres, 
    loadingGenres, 
    addGenre, 
    updateGenre, 
    removeGenre 
  } = usePressSettings();
  
  const handleAddGenre = async () => {
    if (!newGenreName.trim()) return;
    
    const success = await addGenre(newGenreName);
    if (success) {
      setNewGenreName("");
      setIsAddingGenre(false);
    }
  };
  
  const handleEditGenre = (id: string) => {
    const genre = genres.find(g => g.id === id);
    if (genre) {
      setEditingGenreId(id);
      setEditedName(genre.name);
    }
  };
  
  const handleUpdateGenre = async (id: string) => {
    await updateGenre(id, editedName);
    setEditingGenreId(null);
  };
  
  const handleDeleteGenre = async (id: string) => {
    return await removeGenre(id);
  };
  
  const handleCancelAdd = () => {
    setNewGenreName("");
    setIsAddingGenre(false);
  };
  
  const handleCancelEdit = () => {
    setEditingGenreId(null);
    setEditedName("");
  };

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Géneros de Prensa</h3>
        
        {!isAddingGenre && (
          <Button onClick={() => setIsAddingGenre(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Género
          </Button>
        )}
      </div>
      
      {isAddingGenre && (
        <AddGenreForm
          newGenreName={newGenreName}
          setNewGenreName={setNewGenreName}
          handleAddGenre={handleAddGenre}
          handleCancelAdd={handleCancelAdd}
        />
      )}
      
      <GenresTable
        genres={genres}
        loading={loadingGenres}
        onEdit={handleEditGenre}
        onDelete={handleDeleteGenre}
        editingId={editingGenreId}
        setEditingId={setEditingGenreId}
        onSaveEdit={handleUpdateGenre}
        onCancelEdit={handleCancelEdit}
        editedName={editedName}
        setEditedName={setEditedName}
      />
    </CardContent>
  );
}
