
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

export function PrensaPublicity() {
  // Placeholder for demonstration, will be replaced with actual data
  const publicity = [];
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Buscar publicity..."
              className="pl-10"
              prefix={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
          
          <div className="w-48">
            <Select defaultValue="todas">
              <SelectTrigger>
                <SelectValue placeholder="Institución" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las instituciones</SelectItem>
                <SelectItem value="inst1">Institución 1</SelectItem>
                <SelectItem value="inst2">Institución 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Publicity
        </Button>
      </div>

      {publicity.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Medio</TableHead>
              <TableHead>Institución</TableHead>
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
          <h3 className="font-medium text-gray-900 mb-1">No hay publicity registrada</h3>
          <p className="text-sm text-gray-500 mb-4">
            Comience agregando una nueva entrada de publicity
          </p>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Publicity
          </Button>
        </div>
      )}
    </div>
  );
}
