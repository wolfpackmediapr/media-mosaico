
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Save, X } from "lucide-react";
import { PressGenreType } from "@/services/press/types";
import { Dispatch, SetStateAction } from "react";

export interface GenresTableProps {
  paginatedGenres?: PressGenreType[];
  genres?: PressGenreType[];
  loading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  editingId: string | null;
  setEditingId?: Dispatch<SetStateAction<string | null>>;
  onSaveEdit?: (id: string) => Promise<void>;
  onCancelEdit?: () => void;
  editedName?: string;
  setEditedName?: (name: string) => void;
}

export function GenresTable({
  genres,
  paginatedGenres,
  loading = false,
  onEdit,
  onDelete,
  editingId,
  setEditingId,
  onSaveEdit,
  onCancelEdit,
  editedName = "",
  setEditedName = () => {}
}: GenresTableProps) {
  // Use paginatedGenres if provided, otherwise fall back to genres
  const displayGenres = paginatedGenres || genres || [];

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80%]">GÉNERO</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                Cargando géneros...
              </TableCell>
            </TableRow>
          ) : displayGenres.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                No hay géneros configurados
              </TableCell>
            </TableRow>
          ) : (
            displayGenres.map((genre) => (
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
                      <Button 
                        onClick={() => onSaveEdit && onSaveEdit(genre.id)}
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
                      <Button onClick={() => onEdit(genre.id)} size="sm" variant="outline">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={() => onDelete(genre.id)} 
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
}
