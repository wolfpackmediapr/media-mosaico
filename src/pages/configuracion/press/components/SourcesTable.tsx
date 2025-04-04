
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Save, X } from "lucide-react";
import { PressSourceType } from "@/services/press/types";
import { Dispatch, SetStateAction, memo } from "react";

export interface SourcesTableProps {
  sources: PressSourceType[];
  loading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  editingId: string | null;
  setEditingId: Dispatch<SetStateAction<string | null>>;
  onSaveEdit?: (id: string, name: string) => Promise<void>;
  onCancelEdit?: () => void;
  editedName?: string;
  setEditedName?: (name: string) => void;
}

export const SourcesTable = memo(function SourcesTable({
  sources,
  loading,
  onEdit,
  onDelete,
  editingId,
  setEditingId,
  onSaveEdit,
  onCancelEdit,
  editedName = "",
  setEditedName = () => {}
}: SourcesTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80%]">FUENTE</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                Cargando fuentes...
              </TableCell>
            </TableRow>
          ) : sources.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                No hay fuentes encontradas
              </TableCell>
            </TableRow>
          ) : (
            sources.map((source) => (
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
                      <Button 
                        onClick={() => onSaveEdit && onSaveEdit(source.id, editedName)} 
                        size="sm" 
                        variant="default"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={onCancelEdit} 
                        size="sm" 
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => onEdit(source.id)} size="sm" variant="outline">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={() => onDelete(source.id)} 
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
  );
});
