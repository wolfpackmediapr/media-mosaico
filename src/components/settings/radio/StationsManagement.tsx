
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
import { StationsTable } from "./StationsTable";
import { StationFormDialog } from "./StationFormDialog";
import { StationLoadingState } from "./StationStates";
import { StationEmptyState } from "./StationStates";
import { StationsPagination } from "./StationsPagination";
import { toast } from "sonner";
import { 
  fetchStations,
  createStation,
  updateStation,
  deleteStation
} from "@/services/radio/stationService";
import { StationType } from "@/services/radio/types";

export function StationsManagement() {
  const [stations, setStations] = useState<StationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStation, setEditingStation] = useState<StationType | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadStations = async () => {
    setLoading(true);
    try {
      const data = await fetchStations();
      setStations(data);
      
      // Calculate total pages
      setTotalPages(Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE)));
      
      // Reset to page 1 if current page is out of bounds
      if (currentPage > Math.ceil(data.length / ITEMS_PER_PAGE)) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Error loading stations:", error);
      toast.error("Error al cargar las estaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  // Get stations for current page
  const getCurrentPageStations = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return stations.slice(startIndex, endIndex);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleAddStation = async (stationData: Omit<StationType, 'id'>) => {
    try {
      await createStation(stationData);
      toast.success("Estación añadida correctamente");
      loadStations();
      setShowAddDialog(false);
    } catch (error) {
      console.error("Error adding station:", error);
      toast.error("Error al añadir la estación");
    }
  };

  const handleEditStation = (station: StationType) => {
    setEditingStation(station);
  };

  const handleUpdateStation = async (stationData: StationType) => {
    try {
      await updateStation(stationData);
      toast.success("Estación actualizada correctamente");
      loadStations();
      setEditingStation(null);
    } catch (error) {
      console.error("Error updating station:", error);
      toast.error("Error al actualizar la estación");
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta estación? Esta acción también eliminará todos los programas asociados.")) {
      return;
    }
    
    try {
      await deleteStation(id);
      toast.success("Estación eliminada correctamente");
      loadStations();
    } catch (error) {
      console.error("Error deleting station:", error);
      toast.error("Error al eliminar la estación");
    }
  };

  // Get stations for the current page
  const stationsOnCurrentPage = getCurrentPageStations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Estaciones de Radio</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>Añadir Estación</Button>
        </div>
        <CardDescription>
          Administra las estaciones de radio disponibles en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <StationLoadingState />
        ) : stations.length === 0 ? (
          <StationEmptyState />
        ) : (
          <>
            <StationsTable 
              stations={stationsOnCurrentPage} 
              onEdit={handleEditStation}
              onDelete={handleDeleteStation}
            />
            <StationsPagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {stations.length > 0 && (
                `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1} a ${Math.min(currentPage * ITEMS_PER_PAGE, stations.length)} de ${stations.length} estaciones`
              )}
            </p>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={loadStations}>Refrescar</Button>
      </CardFooter>

      {/* Add Station Dialog */}
      <StationFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddStation}
        title="Añadir Estación"
      />

      {/* Edit Station Dialog */}
      {editingStation && (
        <StationFormDialog
          open={!!editingStation}
          onOpenChange={(open) => {
            if (!open) setEditingStation(null);
          }}
          onSubmit={handleUpdateStation}
          title="Editar Estación"
          station={editingStation}
        />
      )}
    </Card>
  );
}
