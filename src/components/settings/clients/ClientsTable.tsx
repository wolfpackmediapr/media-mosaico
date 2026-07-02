
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Client, formatDate } from "@/services/clients/clientService";
import { Edit, Trash2, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string | undefined) => void;
  onToggleActive?: (client: Client, isActive: boolean) => void;
  sortField?: keyof Client;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: keyof Client) => void;
}

export function ClientsTable({
  clients,
  onEdit,
  onDelete,
  onToggleActive,
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
  const SortButton = ({ field }: { field: keyof Client }) => (
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
    <div className="border rounded-md overflow-x-auto">
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
            <TableHead>Estado</TableHead>
            <TableHead>
              Fecha de creación
              <SortButton field="created_at" />
            </TableHead>
            <TableHead className="text-right whitespace-nowrap w-[120px] sticky right-0 bg-background shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)] z-10">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                No se encontraron clientes
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => {
              const isActive = client.is_active !== false;
              return (
              <TableRow key={client.id} className={cn(!isActive && "opacity-60", "align-top")}>
                <TableCell className="font-medium align-top">{client.name}</TableCell>
                <TableCell className="align-top">
                  <Badge variant="outline">{formatCategory(client.category)}</Badge>
                </TableCell>
                <TableCell className="align-top">{client.subcategory || '-'}</TableCell>
                <TableCell className="align-top">
              {client.keywords && client.keywords.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1 max-w-[320px]">
                      {client.keywords.slice(0, 4).map((keyword, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs max-w-[160px] truncate"
                          title={keyword}
                        >
                          {keyword}
                        </Badge>
                      ))}
                      {client.keywords.length > 4 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-accent"
                            >
                              +{client.keywords.length - 4}
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 max-h-80 overflow-y-auto">
                            <div className="flex flex-wrap gap-1">
                              {client.keywords.map((keyword, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin palabras clave</span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => onToggleActive && onToggleActive(client, checked)}
                      disabled={!onToggleActive}
                      aria-label={isActive ? "Desactivar cliente" : "Activar cliente"}
                    />
                    <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                      {isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="align-top">{formatDate(client.created_at)}</TableCell>
                <TableCell className="text-right align-top whitespace-nowrap">
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
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
