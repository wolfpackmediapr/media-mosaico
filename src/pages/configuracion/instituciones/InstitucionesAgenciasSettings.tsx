
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

// Sample data for agencies
const sampleAgencias = [
  { id: 1, nombre: "ACTIVARTE PUBLICIDAD" },
  { id: 2, nombre: "ADTEAM" },
  { id: 3, nombre: "ADWORKS" },
  { id: 4, nombre: "AGENCIA DE PRUEBA" },
  { id: 5, nombre: "ARCO PUBLICIDAD" },
  { id: 6, nombre: "ARTEAGA & ARTEAGA" },
  { id: 7, nombre: "ARTEFACTO" },
  { id: 8, nombre: "ARTERIA PUBLICIDAD" },
  { id: 9, nombre: "BACARDI" },
  { id: 10, nombre: "BADILLO NAZCA SAATCHI & SAATCHI" },
  { id: 11, nombre: "BALLORI & FARRE" },
  { id: 12, nombre: "BBDO" },
  { id: 13, nombre: "BIG THINK GROUP" },
  { id: 14, nombre: "BURSON MARSTETLLER" },
  { id: 15, nombre: "CABEZAS DE SAN JUAN" },
  { id: 16, nombre: "CAMARA DE COMERCIO DE PUERTO RICO" },
  { id: 17, nombre: "CASIANO COMMUNICATIONS" },
  { id: 18, nombre: "CENTRAL COMMUNICATION" },
  { id: 19, nombre: "CENTROS DE SALUD PRIMARIA 330" },
  { id: 20, nombre: "CIMA COMMUNICATIONS" },
  { id: 21, nombre: "COMSTAT ROWLAND" },
  { id: 22, nombre: "COMUNICA" },
  { id: 23, nombre: "COMUNICADORA NEXUS" },
  { id: 24, nombre: "CORPORATE COMMUNICATIONS" },
  { id: 25, nombre: "CORPORATE STRATEGISTS" },
  { id: 26, nombre: "DE LA CRUZ & ASOCIADOS" },
  { id: 27, nombre: "DE MIER & SAINZ DE LA MAZA" },
  { id: 28, nombre: "DIERESIS Y PUNTO A PARTE PUBLICIDAD" },
  { id: 29, nombre: "DYNAMICS INCENTIVES" },
  { id: 30, nombre: "D'ALESSIO COMM" },
  { id: 31, nombre: "EINSTEIN GROUP" },
  { id: 32, nombre: "EJE SOCIEDAD PUBLICITARIA" },
  { id: 33, nombre: "ELI LILLY" },
  { id: 34, nombre: "EMPRESAS FONALLEDAS" },
  { id: 35, nombre: "ERC INTEGRATE COMMUNICATIONS" },
  { id: 36, nombre: "EURO RSCG" },
  { id: 37, nombre: "FCB FOOT CONE & BELDDING INC." },
  { id: 38, nombre: "FLEICHMAN HILLARD" },
  { id: 39, nombre: "FOCUS BUSINESS COMMUNICATIONS" },
  { id: 40, nombre: "GCI DE PUERTO RICO" },
  { id: 41, nombre: "GRAUD ADVERTISING INC." },
  { id: 42, nombre: "GUASP & PARTNERS" },
  { id: 43, nombre: "HILL & KNOWLTON" },
  { id: 44, nombre: "HUFSTETLER & GONZALEZ" },
  { id: 45, nombre: "HUFTETLER & GONZALEZ" },
  { id: 46, nombre: "IMAGEN OPTIMA" },
  { id: 47, nombre: "ISRAEL RODIGUEZ & PARTNERS" },
  { id: 48, nombre: "ISRAEL RODRIGUEZ & PARTNERS" },
  { id: 49, nombre: "J WALTER THOMPSON" },
  { id: 50, nombre: "JMD COMMUNICATIONS" },
  { id: 51, nombre: "KEY COMMUNICATIONS" },
  { id: 52, nombre: "LEO BURNETT" },
  { id: 53, nombre: "LOPITO, ILEANA & HEWIT" },
  { id: 54, nombre: "MARCHAND ICS GROUP" },
  { id: 55, nombre: "MARKETING CONSULTANS" },
  { id: 56, nombre: "MARTI FLORES PRIETO & WACHTEL" },
  { id: 57, nombre: "MCCANN ERICKSON" },
  { id: 58, nombre: "MEDIA MANAGEMENT" },
  { id: 59, nombre: "MEDIA NET" },
  { id: 60, nombre: "MIRAMAR COMMUNICATIONS GROUP" },
  { id: 61, nombre: "MOVIE ADS INC." },
  { id: 62, nombre: "NEO COMMUNICATION" },
  { id: 63, nombre: "NEW HYPERION ASSOCIATES" },
  { id: 64, nombre: "NEX STEP MARKETING" },
  { id: 65, nombre: "PARADIGM ASSOCIATES" },
  { id: 66, nombre: "PARTNERS COMMUNICATIONS" },
  { id: 67, nombre: "PENSSANDO" },
  { id: 68, nombre: "PENTAMARK" },
  { id: 69, nombre: "PERFECT PARTNERS" },
  { id: 70, nombre: "PHARMACON INC." },
  { id: 71, nombre: "PROMO AGE" },
  { id: 72, nombre: "PROMOCIONES DEL CARIBE" },
  { id: 73, nombre: "PUBLIC AFFAIR CONSULTANTS" },
  { id: 74, nombre: "PUBLICIDAD TERE SUAREZ" },
  { id: 75, nombre: "PUBLICIS" },
  { id: 76, nombre: "PUBLIMER" },
  { id: 77, nombre: "PUNTO I" },
  { id: 78, nombre: "R.J. RAYNOLDS TOBACCO CO." },
  { id: 79, nombre: "REMA" },
  { id: 80, nombre: "ROMA BC" },
  { id: 81, nombre: "ROSADO & MORALES" },
  { id: 82, nombre: "SAJO & GARCIA" },
  { id: 83, nombre: "SALA CREATIVA" },
  { id: 84, nombre: "SALUS" },
  { id: 85, nombre: "SINEXIS" },
  { id: 86, nombre: "SOCIEDAD PUERTORRIQUEÑA DE CIENCIA Y MEDICINA CANNÁBICA EN PUERTO RICO" },
  { id: 87, nombre: "SUAGM" },
  { id: 88, nombre: "TACTICAL MEDIA GROUP" },
  { id: 89, nombre: "UP FRONT" },
  { id: 90, nombre: "WYETH" },
  { id: 91, nombre: "YOUNG & RUBICAM PR INC." },
];

export function InstitucionesAgenciasSettings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter agencies based on search term
  const filteredAgencias = sampleAgencias.filter(agencia => 
    searchTerm === "" || agencia.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredAgencias.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAgencias = filteredAgencias.slice(
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
              placeholder="Buscar agencia..."
              className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button className="sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Agencia
          </Button>
        </div>

        {paginatedAgencias.length > 0 ? (
          <>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-full">AGENCIA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAgencias.map((agencia) => (
                    <TableRow key={agencia.id}>
                      <TableCell>{agencia.nombre}</TableCell>
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
            <h3 className="font-medium text-gray-900 mb-1">No hay agencias</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm 
                ? "No se encontraron agencias con los filtros aplicados" 
                : "Agregue agencias para comenzar a gestionarlas"}
            </p>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Agencia
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  );
}
