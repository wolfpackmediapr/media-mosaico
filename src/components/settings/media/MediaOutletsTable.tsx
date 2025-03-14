
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Pencil, Trash2, Check, X } from "lucide-react";

export interface MediaOutlet {
  id: string;
  type: string;
  name: string;
  folder: string | null;
  created_at: string;
}

interface MediaOutletsTableProps {
  mediaOutlets: MediaOutlet[];
  sortField: keyof MediaOutlet;
  sortOrder: 'asc' | 'desc';
  onSort: (field: keyof MediaOutlet) => void;
  onEdit: (outlet: MediaOutlet) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editFormData: MediaOutlet | null;
  onEditFormChange: (updatedOutlet: MediaOutlet) => void;
  onSaveEdit: () => Promise<void>;
  onCancelEdit: () => void;
  loading: boolean;
}

export function MediaOutletsTable({
  mediaOutlets,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  editingId,
  editFormData,
  onEditFormChange,
  onSaveEdit,
  onCancelEdit,
  loading
}: MediaOutletsTableProps) {
  
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

  if (loading) {
    return null; // Loading state is handled by parent component
  }

  if (mediaOutlets.length === 0) {
    return null; // Empty state is handled by parent component
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead 
            className="cursor-pointer"
            onClick={() => onSort('type')}
          >
            Tipo {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead 
            className="cursor-pointer"
            onClick={() => onSort('name')}
          >
            Nombre {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead 
            className="cursor-pointer"
            onClick={() => onSort('folder')}
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
                  onValueChange={(value) => onEditFormChange({...editFormData!, type: value})}
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
                  onChange={(e) => onEditFormChange({...editFormData!, name: e.target.value})}
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
                  onChange={(e) => onEditFormChange({...editFormData!, folder: e.target.value})}
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
                      onClick={onSaveEdit}
                      title="Guardar"
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onCancelEdit}
                      title="Cancelar"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(outlet)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(outlet.id)}
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
  );
}
