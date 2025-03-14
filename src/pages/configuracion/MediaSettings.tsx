
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<MediaOutlet | null>(null);
  const [formData, setFormData] = useState({
    type: "tv",
    name: "",
    folder: ""
  });

  // Fetch media outlets from Supabase
  const fetchMediaOutlets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .select('*')
        .order('type')
        .order('name');

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
  const addMediaOutlet = async () => {
    try {
      const { data, error } = await supabase
        .from('media_outlets')
        .insert([
          {
            type: formData.type,
            name: formData.name,
            folder: formData.folder || null
          }
        ])
        .select();

      if (error) throw error;
      toast.success('Medio añadido correctamente');
      setIsAddDialogOpen(false);
      resetForm();
      fetchMediaOutlets();
    } catch (error) {
      console.error('Error adding media outlet:', error);
      toast.error('Error al añadir el medio');
    }
  };

  // Update an existing media outlet
  const updateMediaOutlet = async () => {
    if (!selectedOutlet) return;

    try {
      const { error } = await supabase
        .from('media_outlets')
        .update({
          type: formData.type,
          name: formData.name,
          folder: formData.folder || null
        })
        .eq('id', selectedOutlet.id);

      if (error) throw error;
      toast.success('Medio actualizado correctamente');
      setIsEditDialogOpen(false);
      resetForm();
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

  // Reset form data
  const resetForm = () => {
    setFormData({
      type: "tv",
      name: "",
      folder: ""
    });
    setSelectedOutlet(null);
  };

  // Handle opening the edit dialog
  const handleEditClick = (outlet: MediaOutlet) => {
    setSelectedOutlet(outlet);
    setFormData({
      type: outlet.type,
      name: outlet.name,
      folder: outlet.folder || ""
    });
    setIsEditDialogOpen(true);
  };

  // Load data on component mount
  useEffect(() => {
    fetchMediaOutlets();
  }, []);

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

  return (
    <SettingsLayout
      title="Medios"
      description="Administra los medios de comunicación disponibles en el sistema"
    >
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Medios de Comunicación</span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Añadir Medio</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Medio</DialogTitle>
                <DialogDescription>
                  Ingresa los detalles del nuevo medio de comunicación.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Tipo
                  </Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData({...formData, type: value})}
                  >
                    <SelectTrigger className="col-span-3">
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="folder" className="text-right">
                    Carpeta
                  </Label>
                  <Input
                    id="folder"
                    value={formData.folder}
                    onChange={(e) => setFormData({...formData, folder: e.target.value})}
                    className="col-span-3"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" onClick={addMediaOutlet} disabled={!formData.name}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Lista de medios de comunicación disponibles en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6">Cargando medios...</div>
        ) : mediaOutlets.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No hay medios de comunicación configurados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Carpeta</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediaOutlets.map((outlet) => (
                <TableRow key={outlet.id}>
                  <TableCell>{getTypeLabel(outlet.type)}</TableCell>
                  <TableCell>{outlet.name}</TableCell>
                  <TableCell>{outlet.folder || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(outlet)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMediaOutlet(outlet.id)}
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Medio</DialogTitle>
              <DialogDescription>
                Actualiza los detalles del medio de comunicación.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">
                  Tipo
                </Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <SelectTrigger className="col-span-3">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-folder" className="text-right">
                  Carpeta
                </Label>
                <Input
                  id="edit-folder"
                  value={formData.folder}
                  onChange={(e) => setFormData({...formData, folder: e.target.value})}
                  className="col-span-3"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" onClick={updateMediaOutlet} disabled={!formData.name}>
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
