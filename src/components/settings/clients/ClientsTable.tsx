
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Client, formatDate } from "@/services/clients/clientService";
import { Edit, Trash2, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string | undefined) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

export function ClientsTable({
  clients,
  onEdit,
  onDelete,
  sortField = "name",
  sortOrder = "asc",
  onSort
}: ClientsTableProps) {
  // Helper function to format category
  const formatCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'GOBIERNO': 'Gobierno',
      'EMPRESA': 'Empresa',
      'ONG': 'ONG',
      'EDUCACION': 'Educación',
      'SALUD': 'Salud',
      'OTRO': 'Otro'
    };
    
    return categoryMap[category] || category;
  };

  // Helper for sort button
  const SortButton = ({ field }: { field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort && onSort(field)}
      className="ml-1 h-8 data-[state=active]:bg-accent"
      data-state={sortField === field ? 'active' : 'inactive'}
    >
      <ArrowUpDown className="h-4 w-4" />
      <span className="sr-only">Ordenar por {field}</span>
    </Button>
  );

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              Nombre
              <SortButton field="name" />
            </TableHead>
            <TableHead>
              Categoría
              <SortButton field="category" />
            </TableHead>
            <TableHead>Subcategoría</TableHead>
            <TableHead>Palabras clave</TableHead>
            <TableHead>
              Fecha de creación
              <SortButton field="created_at" />
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                No se encontraron clientes
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{formatCategory(client.category)}</Badge>
                </TableCell>
                <TableCell>{client.subcategory || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[300px]">
                    {client.keywords && client.keywords.length > 0 ? (
                      client.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin palabras clave</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatDate(client.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(client)}
                    className="mr-1"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => client.id && onDelete(client.id)}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
