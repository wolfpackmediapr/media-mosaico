
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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
  SelectValue,
} from "@/components/ui/select";

export function RadioNoticias() {
  // Placeholder for demonstration, will be replaced with actual data
  const noticias = [];
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Buscar noticia..."
              className="pl-10"
              prefix={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
          
          <div className="w-48">
            <Select defaultValue="todas">
              <SelectTrigger>
                <SelectValue placeholder="Emisora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las emisoras</SelectItem>
                <SelectItem value="emisora1">Emisora 1</SelectItem>
                <SelectItem value="emisora2">Emisora 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Noticia
        </Button>
      </div>

      {noticias.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Emisora</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Table rows will go here */}
          </TableBody>
        </Table>
      ) : (
        <div className="bg-gray-50 p-10 text-center rounded-md border border-dashed border-gray-300">
          <h3 className="font-medium text-gray-900 mb-1">No hay noticias registradas</h3>
          <p className="text-sm text-gray-500 mb-4">
            Comience agregando una nueva noticia
          </p>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Noticia
          </Button>
        </div>
      )}
    </div>
  );
}
