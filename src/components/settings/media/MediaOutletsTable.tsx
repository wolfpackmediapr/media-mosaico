
import { useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Pencil, Trash, X, ArrowDown, ArrowUp } from "lucide-react";
import { MediaOutlet } from "@/services/media/mediaService";

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
  onSaveEdit: () => Promise<boolean>;
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
  const inputRef = useRef<HTMLInputElement>(null);
  
  const getSortIcon = (field: keyof MediaOutlet) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };
  
  const handleSaveEdit = async () => {
    const success = await onSaveEdit();
    if (success && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted transition-colors"
              onClick={() => onSort('type')}
            >
              <div className="flex items-center">
                TIPO {getSortIcon('type')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted transition-colors"
              onClick={() => onSort('name')}
            >
              <div className="flex items-center">
                NOMBRE {getSortIcon('name')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted transition-colors"
              onClick={() => onSort('folder')}
            >
              <div className="flex items-center">
                CARPETA {getSortIcon('folder')}
              </div>
            </TableHead>
            <TableHead className="w-[100px] text-right">ACCIONES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mediaOutlets.map((outlet) => (
            <TableRow key={outlet.id} className={loading ? 'opacity-50' : ''}>
              {editingId === outlet.id && editFormData ? (
                <>
                  <TableCell>
                    <Select 
                      value={editFormData.type} 
                      onValueChange={(value) => onEditFormChange({...editFormData, type: value})}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tv">TV</SelectItem>
                        <SelectItem value="radio">Radio</SelectItem>
                        <SelectItem value="prensa">Prensa</SelectItem>
                        <SelectItem value="prensa_escrita">Prensa Escrita</SelectItem>
                        <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      ref={inputRef}
                      value={editFormData.name}
                      onChange={(e) => onEditFormChange({...editFormData, name: e.target.value})}
                      placeholder="Nombre del medio"
                      className="w-full"
                      autoFocus
                      disabled={loading}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editFormData.folder || ''}
                      onChange={(e) => onEditFormChange({...editFormData, folder: e.target.value || null})}
                      placeholder="Carpeta (opcional)"
                      className="w-full"
                      disabled={loading}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end space-x-1">
                      <Button 
                        onClick={handleSaveEdit} 
                        size="icon" 
                        variant="ghost"
                        disabled={loading}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button 
                        onClick={onCancelEdit} 
                        size="icon" 
                        variant="ghost"
                        disabled={loading}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell>
                    {outlet.type === 'tv' && 'TV'}
                    {outlet.type === 'radio' && 'Radio'}
                    {outlet.type === 'prensa' && 'Prensa'}
                    {outlet.type === 'prensa_escrita' && 'Prensa Escrita'}
                    {outlet.type === 'redes_sociales' && 'Redes Sociales'}
                  </TableCell>
                  <TableCell>{outlet.name}</TableCell>
                  <TableCell>{outlet.folder || '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end space-x-1">
                      <Button 
                        onClick={() => onEdit(outlet)} 
                        size="icon" 
                        variant="ghost"
                        disabled={loading || editingId !== null}
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button 
                        onClick={() => onDelete(outlet.id)} 
                        size="icon" 
                        variant="ghost"
                        disabled={loading || editingId !== null}
                      >
                        <Trash className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
