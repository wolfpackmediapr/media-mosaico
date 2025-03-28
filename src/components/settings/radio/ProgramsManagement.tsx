
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ProgramsTable } from "./ProgramsTable";
import { ProgramFormDialog } from "./ProgramFormDialog";
import { ProgramLoadingState, ProgramEmptyState } from "./ProgramStates";
import { ProgramsPagination } from "./ProgramsPagination";
import { ProgramStationFilter } from "./ProgramStationFilter";
import { toast } from "sonner";
import { 
  fetchPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getProgramsByStation
} from "@/services/radio/programService";
import { fetchStations } from "@/services/radio/stationService";
import { ProgramType, StationType } from "@/services/radio/types";

export function ProgramsManagement() {
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramType[]>([]);
  const [stations, setStations] = useState<StationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramType | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const stationsData = await fetchStations();
      setStations(stationsData);
      
      const programsData = await fetchPrograms();
      setPrograms(programsData);
      
      // Initialize filtered programs with all programs
      setFilteredPrograms(programsData);
      
      // Calculate total pages
      setTotalPages(Math.max(1, Math.ceil(programsData.length / ITEMS_PER_PAGE)));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter programs when stationId changes
  useEffect(() => {
    const filterPrograms = async () => {
      try {
        if (selectedStationId === 'all') {
          setFilteredPrograms(programs);
        } else {
          const filtered = await getProgramsByStation(selectedStationId);
          setFilteredPrograms(filtered);
        }
        // Reset to page 1 when filter changes
        setCurrentPage(1);
        
        // Calculate total pages
        const newTotalPages = Math.max(1, Math.ceil(
          (selectedStationId === 'all' ? programs.length : filteredPrograms.length) / ITEMS_PER_PAGE
        ));
        setTotalPages(newTotalPages);
      } catch (error) {
        console.error("Error filtering programs:", error);
      }
    };
    
    filterPrograms();
  }, [selectedStationId, programs]);

  // Get programs for current page
  const getCurrentPagePrograms = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPrograms.slice(startIndex, endIndex);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStationChange = (stationId: string) => {
    setSelectedStationId(stationId);
  };

  const handleAddProgram = async (programData: Omit<ProgramType, 'id' | 'created_at'>) => {
    try {
      await createProgram(programData);
      toast.success("Programa añadido correctamente");
      loadData();
      setShowAddDialog(false);
    } catch (error) {
      console.error("Error adding program:", error);
      toast.error("Error al añadir el programa");
    }
  };

  const handleEditProgram = (program: ProgramType) => {
    setEditingProgram(program);
  };

  const handleUpdateProgram = async (programData: ProgramType) => {
    try {
      await updateProgram(programData);
      toast.success("Programa actualizado correctamente");
      loadData();
      setEditingProgram(null);
    } catch (error) {
      console.error("Error updating program:", error);
      toast.error("Error al actualizar el programa");
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este programa?")) {
      return;
    }
    
    try {
      await deleteProgram(id);
      toast.success("Programa eliminado correctamente");
      loadData();
    } catch (error) {
      console.error("Error deleting program:", error);
      toast.error("Error al eliminar el programa");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Programas de Radio</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>Añadir Programa</Button>
        </div>
        <CardDescription>
          Administra los programas de radio disponibles en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ProgramLoadingState />
        ) : programs.length === 0 ? (
          <ProgramEmptyState hasStations={stations.length > 0} />
        ) : (
          <>
            <ProgramStationFilter 
              stations={stations}
              selectedStationId={selectedStationId}
              onStationChange={handleStationChange}
            />
            
            <div className="mt-4">
              <ProgramsTable 
                programs={getCurrentPagePrograms()} 
                stations={stations}
                onEdit={handleEditProgram}
                onDelete={handleDeleteProgram}
              />
            </div>
            
            {filteredPrograms.length > ITEMS_PER_PAGE && (
              <div className="mt-4">
                <ProgramsPagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-2">
              {filteredPrograms.length > 0 && (
                `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1} a ${Math.min(currentPage * ITEMS_PER_PAGE, filteredPrograms.length)} de ${filteredPrograms.length} programas`
              )}
            </p>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={loadData}>Refrescar</Button>
      </CardFooter>

      {/* Add Program Dialog */}
      <ProgramFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddProgram}
        title="Añadir Programa"
        stations={stations}
      />

      {/* Edit Program Dialog */}
      {editingProgram && (
        <ProgramFormDialog
          open={!!editingProgram}
          onOpenChange={(open) => {
            if (!open) setEditingProgram(null);
          }}
          onSubmit={handleUpdateProgram}
          title="Editar Programa"
          program={editingProgram}
          stations={stations}
        />
      )}
    </Card>
  );
}
