
import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { MediaPagination } from "@/components/settings/media/MediaPagination";

type Genre = {
  id: string;
  name: string;
};

export function GenresSettings() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newGenreName, setNewGenreName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGenres, setFilteredGenres] = useState<Genre[]>([]);
  const itemsPerPage = 10;

  useEffect(() => {
    // Initial data - in a real app, this would come from the API
    const initialGenres: Genre[] = [
      { id: "1", name: "ARTÍCULO" },
      { id: "2", name: "COLUMNA" },
      { id: "3", name: "COMENTARIO" },
      { id: "4", name: "CRÍTICA" },
      { id: "5", name: "EDITORIAL" },
      { id: "6", name: "ENCUESTA" },
      { id: "7", name: "ENTREVISTA" },
      { id: "8", name: "NOTA COMENTADA" },
      { id: "9", name: "NOTA INFORMATIVA" },
      { id: "10", name: "REPORTAJE" },
      { id: "11", name: "RESEÑA" },
      { id: "12", name: "SALUD" },
    ];
    
    setGenres(initialGenres);
    setFilteredGenres(initialGenres);
    setIsLoading(false);
  }, []);

  // Update filtered genres when genres or search term change
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredGenres(genres);
    } else {
      const filtered = genres.filter(genre => 
        genre.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGenres(filtered);
    }
    setCurrentPage(1); // Reset to first page on search
  }, [searchTerm, genres]);

  const handleAddGenre = () => {
    if (!newGenreName.trim()) {
      toast.error("El nombre del género no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    const newGenre: Genre = {
      id: Date.now().toString(),
      name: newGenreName.trim().toUpperCase(),
    };

    setGenres([...genres, newGenre]);
    setNewGenreName("");
    setIsAddingNew(false);
    toast.success("Género añadido correctamente");
  };

  const handleEditGenre = (id: string) => {
    const genre = genres.find(g => g.id === id);
    if (genre) {
      setEditingId(id);
      setEditedName(genre.name);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editedName.trim()) {
      toast.error("El nombre del género no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    setGenres(genres.map(genre => 
      genre.id === id ? { ...genre, name: editedName.trim().toUpperCase() } : genre
    ));
    setEditingId(null);
    toast.success("Género actualizado correctamente");
  };

  const handleDeleteGenre = (id: string) => {
    // In a real app, this would call an API
    setGenres(genres.filter(genre => genre.id !== id));
    toast.success("Género eliminado correctamente");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredGenres.length / itemsPerPage);
  const paginatedGenres = filteredGenres.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-56">
          <p className="text-muted-foreground">Cargando géneros...</p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Géneros Periodísticos</h3>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar género
          </Button>
        )}
      </div>
      
      {/* Search section */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-64 space-y-1.5">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar género..."
            className="pr-10"
          />
        </div>
      </div>
      
      {isAddingNew && (
        <div className="flex gap-2 mb-4 items-center">
          <Input
            value={newGenreName}
            onChange={(e) => setNewGenreName(e.target.value)}
            placeholder="Nombre del género"
            className="max-w-md"
          />
          <Button onClick={handleAddGenre} size="sm" variant="default">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
          <Button onClick={() => setIsAddingNew(false)} size="sm" variant="outline">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80%]">GÉNERO</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGenres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                  No hay géneros periodísticos configurados
                </TableCell>
              </TableRow>
            ) : (
              paginatedGenres.map((genre) => (
                <TableRow key={genre.id}>
                  <TableCell>
                    {editingId === genre.id ? (
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="max-w-md"
                      />
                    ) : (
                      genre.name
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === genre.id ? (
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => handleSaveEdit(genre.id)} size="sm" variant="default">
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleCancelEdit} size="sm" variant="outline">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => handleEditGenre(genre.id)} size="sm" variant="outline">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteGenre(genre.id)} 
                          size="sm" 
                          variant="outline"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {filteredGenres.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm">
            REGISTRO {(currentPage - 1) * itemsPerPage + 1} A {Math.min(currentPage * itemsPerPage, filteredGenres.length)} DE {filteredGenres.length}
          </div>
          <MediaPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </CardContent>
  );
}
