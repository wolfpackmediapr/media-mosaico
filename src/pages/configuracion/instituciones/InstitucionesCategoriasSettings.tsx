
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Sample data - this would be replaced with actual data from a service
const categorias = [
  "ABOGADOS", "ADEREZOS", "AEREOLINEAS", "AGENCIAS ACREDITADORAS", "AGENCIAS GUBERNAMENTALES",
  "AGENCIAS PUBLICITARIAS", "AGENCIAS PUBLICO PRIVADAS", "AGRICULTURA", "ALCALDIAS", "AMBIENTE",
  "ANTIACIDOS", "ASEGURADORAS", "ASESORES FINANCIEROS", "ASOCIACIONES", "AUTOS",
  "BANCOS", "BANCOS - CUENTA DE CHEQUE", "BANCOS HIPOTECARIOS (MORTGAGE)", "BASURA Y RECICLAJE", "BEBIDAS",
  // Add more categories as needed
];

export function InstitucionesCategoriasSettings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter categories based on search term
  const filteredCategorias = categorias.filter(categoria => 
    searchTerm === "" || categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredCategorias.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCategorias = filteredCategorias.slice(
    startIndex, 
    startIndex + itemsPerPage
  );

  return (
    <CardContent className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar categoría..."
              className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button className="sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Categoría
          </Button>
        </div>

        {paginatedCategorias.length > 0 ? (
          <>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CATEGORÍA</TableHead>
                    <TableHead className="w-24 text-right">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCategorias.map((categoria, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{categoria}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Editar</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Button>
                      </TableCell>
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
            <h3 className="font-medium text-gray-900 mb-1">No hay categorías</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm 
                ? "No se encontraron categorías con los filtros aplicados" 
                : "Agregue categorías para clasificar las instituciones"}
            </p>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Categoría
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  );
}
