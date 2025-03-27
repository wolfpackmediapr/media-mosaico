
import { useState, useEffect, useMemo } from "react";
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
import { ProgramChannelFilter } from "./ProgramChannelFilter";
import { toast } from "sonner";
import { 
  fetchPrograms,
  createProgram,
  updateProgram,
  deleteProgram
} from "@/services/tv/programService";
import { 
  fetchChannels
} from "@/services/tv/channelService";
import { ProgramType, ChannelType } from "@/services/tv/types";

interface ProgramsManagementProps {
  isLoading?: boolean;
}

export function ProgramsManagement({ isLoading = false }: ProgramsManagementProps) {
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramType | null>(null);
  
  // Filtering state
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const [programsData, channelsData] = await Promise.all([
        fetchPrograms(),
        fetchChannels()
      ]);
      setPrograms(programsData);
      setChannels(channelsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isLoading]);

  // Filter programs by selected channel
  const filteredPrograms = useMemo(() => {
    if (selectedChannelId === 'all') {
      return programs;
    }
    return programs.filter(program => program.channel_id === selectedChannelId);
  }, [programs, selectedChannelId]);

  // Calculate total pages based on filtered programs
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredPrograms.length / ITEMS_PER_PAGE));
  }, [filteredPrograms]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedChannelId]);

  const handleAddProgram = async (programData: Omit<ProgramType, 'id'>) => {
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

  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get current page programs
  const getCurrentPagePrograms = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPrograms.slice(startIndex, endIndex);
  };

  // Use external loading state if provided
  const isPageLoading = loading || isLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Programas de Televisión</CardTitle>
          <Button 
            onClick={() => setShowAddDialog(true)}
            disabled={channels.length === 0 || isPageLoading}
          >
            Añadir Programa
          </Button>
        </div>
        <CardDescription>
          Administra los programas de televisión disponibles en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPageLoading ? (
          <ProgramLoadingState />
        ) : programs.length === 0 ? (
          <ProgramEmptyState hasChannels={channels.length > 0} />
        ) : (
          <>
            <ProgramChannelFilter 
              channels={channels}
              selectedChannelId={selectedChannelId}
              onChannelChange={handleChannelChange}
            />
            
            <div className="mt-4">
              <ProgramsTable 
                programs={getCurrentPagePrograms()} 
                channels={channels}
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
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={loadData} disabled={isPageLoading}>Refrescar</Button>
        <div className="text-sm text-muted-foreground">
          {filteredPrograms.length > 0 && (
            `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1} a ${Math.min(currentPage * ITEMS_PER_PAGE, filteredPrograms.length)} de ${filteredPrograms.length} programas`
          )}
        </div>
      </CardFooter>

      {/* Add Program Dialog */}
      <ProgramFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddProgram}
        title="Añadir Programa"
        channels={channels}
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
          channels={channels}
        />
      )}
    </Card>
  );
}
