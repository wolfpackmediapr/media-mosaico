
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

export function ProgramsManagement() {
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramType | null>(null);

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
  }, []);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Programas de Televisión</CardTitle>
          <Button 
            onClick={() => setShowAddDialog(true)}
            disabled={channels.length === 0}
          >
            Añadir Programa
          </Button>
        </div>
        <CardDescription>
          Administra los programas de televisión disponibles en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ProgramLoadingState />
        ) : programs.length === 0 ? (
          <ProgramEmptyState hasChannels={channels.length > 0} />
        ) : (
          <ProgramsTable 
            programs={programs} 
            channels={channels}
            onEdit={handleEditProgram}
            onDelete={handleDeleteProgram}
          />
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
