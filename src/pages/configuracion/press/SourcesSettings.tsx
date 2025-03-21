
import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Save, X, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MediaPagination } from "@/components/settings/media/MediaPagination";

type Source = {
  id: string;
  name: string;
};

export function SourcesSettings() {
  const [sources, setSources] = useState<Source[]>([]);
  const [filteredSources, setFilteredSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSourceName, setNewSourceName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Initial data - in a real app, this would come from the API
    const initialSources: Source[] = [
      { id: "1", name: "EFE" },
      { id: "2", name: "AIOLA VIRELLA" },
      { id: "3", name: "ALEX DAVID" },
      { id: "4", name: "ANDREA MARTINEZ" },
      { id: "5", name: "ANTONIO GOMEZ" },
      { id: "6", name: "ALBA Y. MUÑIZ" },
      { id: "7", name: "CAMILE ROLDAN" },
      { id: "8", name: "CARMEN ARROYO" },
      { id: "9", name: "CARMEN MILLAN" },
      { id: "10", name: "CESAR VAZQUEZ" },
      { id: "11", name: "CYNTHIA LOPEZ" },
      { id: "12", name: "DANIEL RIVERA" },
      { id: "13", name: "DENNISE PEREZ" },
      { id: "14", name: "EDWARD ZAYAS" },
      { id: "15", name: "ENRIQUE MARTEL" },
      { id: "16", name: "EUGENIO HOPGOOD" },
      { id: "17", name: "EVA LLORENS" },
      { id: "18", name: "FIRUZEH SHOKOOH" },
      { id: "19", name: "FRANCES ROSARIO" },
      { id: "20", name: "FRANCISCO RODRIGUEZ" },
      // Adding more from provided list
      { id: "21", name: "MARGA PARES" },
      { id: "22", name: "MARIA MIRANDA" },
      { id: "23", name: "MARIA VERA" },
      { id: "24", name: "MARIAN DIAZ" },
      { id: "25", name: "MARIANA COBIAN" },
      { id: "26", name: "EL NUEVO DÍA" },
      { id: "27", name: "PRIMERA HORA" },
      { id: "28", name: "EL VOCERO" },
      { id: "29", name: "INDICE" },
      { id: "30", name: "METRO" },
      // Adding even more to demonstrate pagination
      { id: "31", name: "CYBERNEWS" },
      { id: "32", name: "JAY FONSECA" },
      { id: "33", name: "DANICA COTO" }
    ];
    
    setSources(initialSources);
    setFilteredSources(initialSources);
    setIsLoading(false);
  }, []);

  // Filter sources based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredSources(sources);
    } else {
      const filtered = sources.filter(source => 
        source.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSources(filtered);
    }
    setCurrentPage(1); // Reset to first page on search
  }, [searchTerm, sources]);

  const handleAddSource = () => {
    if (!newSourceName.trim()) {
      toast.error("El nombre de la fuente no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    const newSource: Source = {
      id: Date.now().toString(),
      name: newSourceName.trim().toUpperCase(),
    };

    setSources([...sources, newSource]);
    setNewSourceName("");
    setIsAddingNew(false);
    toast.success("Fuente añadida correctamente");
  };

  const handleEditSource = (id: string) => {
    const source = sources.find(s => s.id === id);
    if (source) {
      setEditingId(id);
      setEditedName(source.name);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editedName.trim()) {
      toast.error("El nombre de la fuente no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    setSources(sources.map(source => 
      source.id === id ? { ...source, name: editedName.trim().toUpperCase() } : source
    ));
    setEditingId(null);
    toast.success("Fuente actualizada correctamente");
  };

  const handleDeleteSource = (id: string) => {
    // In a real app, this would call an API
    setSources(sources.filter(source => source.id !== id));
    toast.success("Fuente eliminada correctamente");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleShowAll = () => {
    setSearchTerm("");
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage);
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-56">
          <p className="text-muted-foreground">Cargando fuentes...</p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Fuentes de Prensa</h3>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar fuente
          </Button>
        )}
      </div>
      
      {/* Search section */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-64 space-y-1.5">
          <Label htmlFor="search-source">FUENTE</Label>
          <div className="relative">
            <Input
              id="search-source"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar fuente..."
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={() => setSearchTerm(searchTerm)} size="sm" variant="secondary">
            Buscar
          </Button>
          <Button onClick={handleShowAll} size="sm" variant="outline">
            Mostrar todo
          </Button>
        </div>
      </div>
      
      {/* Add new source form */}
      {isAddingNew && (
        <div className="flex gap-2 mb-4 items-center">
          <Input
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            placeholder="Nombre de la fuente"
            className="max-w-md"
          />
          <Button onClick={handleAddSource} size="sm" variant="default">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
          <Button onClick={() => setIsAddingNew(false)} size="sm" variant="outline">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      )}

      {/* Sources table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80%]">FUENTE</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                  No hay fuentes encontradas
                </TableCell>
              </TableRow>
            ) : (
              paginatedSources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    {editingId === source.id ? (
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="max-w-md"
                      />
                    ) : (
                      source.name
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === source.id ? (
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => handleSaveEdit(source.id)} size="sm" variant="default">
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleCancelEdit} size="sm" variant="outline">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => handleEditSource(source.id)} size="sm" variant="outline">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteSource(source.id)} 
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
      {filteredSources.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm">
            REGISTRO {(currentPage - 1) * itemsPerPage + 1} A {Math.min(currentPage * itemsPerPage, filteredSources.length)} DE {filteredSources.length}
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
