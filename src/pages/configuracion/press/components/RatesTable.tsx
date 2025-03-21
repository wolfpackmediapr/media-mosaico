
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Save, X } from "lucide-react";
import { Source } from "../types/press-types";

interface RatesTableProps {
  paginatedRates: Source[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  editingId: string | null;
  editedName: string;
  setEditedName: (name: string) => void;
}

export function RatesTable({
  paginatedRates,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editingId,
  editedName,
  setEditedName
}: RatesTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80%]">TARIFA</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                No hay tarifas encontradas
              </TableCell>
            </TableRow>
          ) : (
            paginatedRates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell>
                  {editingId === rate.id ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="max-w-md"
                    />
                  ) : (
                    rate.name
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === rate.id ? (
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => onSaveEdit(rate.id)} size="sm" variant="default">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button onClick={onCancelEdit} size="sm" variant="outline">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => onEdit(rate.id)} size="sm" variant="outline">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={() => onDelete(rate.id)} 
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
