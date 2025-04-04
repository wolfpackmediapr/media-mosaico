
import { useState } from "react";
import { CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Sample data - this would be replaced with actual data from a service
const sampleInstituciones = [
  { id: 1, categoria: "AGENCIAS GUBERNAMENTALES", nombre: "ADMINISTRACION DE ASUNTOS ENERGETICOS" },
  { id: 2, categoria: "AGENCIAS GUBERNAMENTALES", nombre: "ADMINISTRACION DE ASUNTOS FEDERALES DE PUERTO RICO" },
  { id: 3, categoria: "AGENCIAS GUBERNAMENTALES", nombre: "ADMINISTRACION DE COMPENSACIONES POR ACCIDENTES AUTOMOVILISTICOS (ACAA)" },
  { id: 4, categoria: "AGENCIAS GUBERNAMENTALES", nombre: "ADMINISTRACION DE CORRECCION" },
  { id: 5, categoria: "AGENCIAS GUBERNAMENTALES", nombre: "ADMINISTRACION DE DESARROLLO SOCIOECONOMICO DE LA FAMILIA (ADSEF)" },
  // Add more sample data as needed
];

// Sample categories for filter
const categorias = [
  "ABOGADOS", "ADEREZOS", "AEREOLINEAS", "AGENCIAS ACREDITADORAS", "AGENCIAS GUBERNAMENTALES",
  "AGENCIAS PUBLICITARIAS", "AGENCIAS PUBLICO PRIVADAS", "AGRICULTURA", "ALCALDIAS"
  // Add more categories as needed
];

export function InstitucionesGestionSettings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("todas");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter institutions based on search term and selected category
  const filteredInstituciones = sampleInstituciones.filter(institucion => {
    const matchesSearch = searchTerm === "" || 
      institucion.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = selectedCategoria === "todas" || 
      institucion.categoria === selectedCategoria;
    return matchesSearch && matchesCategoria;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredInstituciones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInstituciones = filteredInstituciones.slice(
    startIndex, 
    startIndex + itemsPerPage
  );

  return (
    <CardContent className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar institución..."
                className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-48">
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button className="sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Institución
          </Button>
        </div>

        {paginatedInstituciones.length > 0 ? (
          <>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">CATEGORÍA</TableHead>
                    <TableHead className="w-[60%]">INSTITUCIÓN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInstituciones.map((institucion) => (
                    <TableRow key={institucion.id}>
                      <TableCell className="font-medium">{institucion.categoria}</TableCell>
                      <TableCell>{institucion.nombre}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show at most 5 page numbers, centered around the current page if possible
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        isActive={pageNum === currentPage}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </>
        ) : (
          <div className="bg-gray-50 p-10 text-center rounded-md border border-dashed border-gray-300">
            <h3 className="font-medium text-gray-900 mb-1">No hay instituciones</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm || selectedCategoria !== "todas" 
                ? "No se encontraron instituciones con los filtros aplicados" 
                : "Agregue instituciones para comenzar a gestionarlas"}
            </p>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Institución
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  );
}
