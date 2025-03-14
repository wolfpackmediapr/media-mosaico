
import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Pencil, Trash2, Filter, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Define types for media outlets
interface MediaOutlet {
  id: string;
  type: string;
  name: string;
  folder: string | null;
  created_at: string;
}

export default function MediaSettings() {
  const [mediaOutlets, setMediaOutlets] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof MediaOutlet>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form data states
  const [addFormData, setAddFormData] = useState({
    type: "tv",
    name: "",
    folder: ""
  });
  
  const [editFormData, setEditFormData] = useState<MediaOutlet | null>(null);

  // Fetch media outlets from Supabase
  const fetchMediaOutlets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('media_outlets')
        .select('*')
        .order(sortField, { ascending: sortOrder === 'asc' });
      
      // Apply filter if any
      if (filterType) {
        query = query.eq('type', filterType);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setMediaOutlets(data || []);
    } catch (error) {
      console.error('Error fetching media outlets:', error);
      toast.error('Error al cargar los medios');
    } finally {
      setLoading(false);
    }
  };

  // Add a new media outlet
  const addMediaOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .insert([
          {
            type: addFormData.type,
            name: addFormData.name,
            folder: addFormData.folder || null
          }
        ])
        .select();

      if (error) throw error;
      toast.success('Medio añadido correctamente');
      resetAddForm();
      fetchMediaOutlets();
    } catch (error) {
      console.error('Error adding media outlet:', error);
      toast.error('Error al añadir el medio');
    }
  };

  // Start editing a media outlet
  const handleEditClick = (outlet: MediaOutlet) => {
    setEditingId(outlet.id);
    setEditFormData(outlet);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData(null);
  };

  // Save edited media outlet
  const saveEditedOutlet = async () => {
    if (!editFormData) return;

    try {
      const { error } = await supabase
        .from('media_outlets')
        .update({
          type: editFormData.type,
          name: editFormData.name,
          folder: editFormData.folder
        })
        .eq('id', editFormData.id);

      if (error) throw error;
      toast.success('Medio actualizado correctamente');
      setEditingId(null);
      setEditFormData(null);
      fetchMediaOutlets();
    } catch (error) {
      console.error('Error updating media outlet:', error);
      toast.error('Error al actualizar el medio');
    }
  };

  // Delete a media outlet
  const deleteMediaOutlet = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este medio?')) return;

    try {
      const { error } = await supabase
        .from('media_outlets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Medio eliminado correctamente');
      fetchMediaOutlets();
    } catch (error) {
      console.error('Error deleting media outlet:', error);
      toast.error('Error al eliminar el medio');
    }
  };

  // Reset add form
  const resetAddForm = () => {
    setAddFormData({
      type: "tv",
      name: "",
      folder: ""
    });
  };

  // Handle column sort
  const handleSort = (field: keyof MediaOutlet) => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  // Toggle filter visibility
  const toggleFilter = () => {
    setShowFilter(!showFilter);
    if (!showFilter) {
      setFilterType('');
    }
  };

  // Helper function to get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'tv': return 'Televisión';
      case 'radio': return 'Radio';
      case 'prensa': return 'Prensa Digital';
      case 'prensa_escrita': return 'Prensa Escrita';
      case 'redes_sociales': return 'Redes Sociales';
      default: return type;
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchMediaOutlets();
  }, [sortField, sortOrder, filterType]);

  return (
    <SettingsLayout
      title="Medios"
      description="Administra los medios de comunicación disponibles en el sistema"
    >
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Medios de Comunicación</span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={toggleFilter} 
            className="flex items-center gap-1"
          >
            {showFilter ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            <span>{showFilter ? 'Limpiar filtro' : 'Filtrar'}</span>
          </Button>
        </CardTitle>
        <CardDescription>
          Lista de medios de comunicación disponibles en el sistema
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Filter controls */}
        {showFilter && (
          <div className="mb-6 p-4 bg-muted/40 rounded-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="filter-type" className="text-right">
                  Tipo de medio
                </Label>
                <Select 
                  value={filterType} 
                  onValueChange={setFilterType}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="tv">Televisión</SelectItem>
                    <SelectItem value="radio">Radio</SelectItem>
                    <SelectItem value="prensa">Prensa Digital</SelectItem>
                    <SelectItem value="prensa_escrita">Prensa Escrita</SelectItem>
                    <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Add new media form */}
        <form onSubmit={addMediaOutlet} className="mb-6 p-4 border rounded-md">
          <h3 className="text-lg font-medium mb-4">Añadir nuevo medio</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <Label htmlFor="type">Tipo</Label>
              <Select 
                value={addFormData.type} 
                onValueChange={(value) => setAddFormData({...addFormData, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tv">Televisión</SelectItem>
                  <SelectItem value="radio">Radio</SelectItem>
                  <SelectItem value="prensa">Prensa Digital</SelectItem>
                  <SelectItem value="prensa_escrita">Prensa Escrita</SelectItem>
                  <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="sm:col-span-1">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={addFormData.name}
                onChange={(e) => setAddFormData({...addFormData, name: e.target.value})}
                placeholder="Nombre del medio"
                required
              />
            </div>
            
            <div className="sm:col-span-1">
              <Label htmlFor="folder">Carpeta</Label>
              <Input
                id="folder"
                value={addFormData.folder}
                onChange={(e) => setAddFormData({...addFormData, folder: e.target.value})}
                placeholder="Opcional"
              />
            </div>
            
            <div className="sm:col-span-1 flex items-end">
              <Button type="submit" disabled={!addFormData.name} className="w-full">
                Añadir medio
              </Button>
            </div>
          </div>
        </form>

        {/* Media outlets table */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p>Cargando medios...</p>
          </div>
        ) : mediaOutlets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filterType ? 'No hay medios que coincidan con el filtro aplicado.' : 'No hay medios de comunicación configurados.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('type')}
                >
                  Tipo {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  Nombre {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('folder')}
                >
                  Carpeta {sortField === 'folder' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediaOutlets.map((outlet) => (
                <TableRow key={outlet.id}>
                  <TableCell>
                    {editingId === outlet.id ? (
                      <Select 
                        value={editFormData?.type || outlet.type} 
                        onValueChange={(value) => setEditFormData({...editFormData!, type: value})}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tv">Televisión</SelectItem>
                          <SelectItem value="radio">Radio</SelectItem>
                          <SelectItem value="prensa">Prensa Digital</SelectItem>
                          <SelectItem value="prensa_escrita">Prensa Escrita</SelectItem>
                          <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getTypeLabel(outlet.type)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === outlet.id ? (
                      <Input 
                        value={editFormData?.name || ''} 
                        onChange={(e) => setEditFormData({...editFormData!, name: e.target.value})}
                        className="h-8"
                      />
                    ) : (
                      outlet.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === outlet.id ? (
                      <Input 
                        value={editFormData?.folder || ''} 
                        onChange={(e) => setEditFormData({...editFormData!, folder: e.target.value})}
                        className="h-8"
                      />
                    ) : (
                      outlet.folder || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {editingId === outlet.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={saveEditedOutlet}
                            title="Guardar"
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            title="Cancelar"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(outlet)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMediaOutlet(outlet.id)}
                        title="Eliminar"
                        disabled={editingId === outlet.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <p className="text-xs text-muted-foreground">
          Los cambios en los medios pueden afectar a todo el sistema
        </p>
        <Button variant="outline" onClick={fetchMediaOutlets}>
          Refrescar
        </Button>
      </CardFooter>
    </SettingsLayout>
  );
}
