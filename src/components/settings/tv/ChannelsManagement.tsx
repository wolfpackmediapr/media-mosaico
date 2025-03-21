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
import { ChannelsTable } from "./ChannelsTable";
import { ChannelFormDialog } from "./ChannelFormDialog";
import { ChannelLoadingState } from "./ChannelStates";
import { ChannelEmptyState } from "./ChannelStates";
import { toast } from "sonner";
import { 
  fetchChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  ChannelType
} from "@/services/tv";

export function ChannelsManagement() {
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelType | null>(null);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const data = await fetchChannels();
      setChannels(data);
    } catch (error) {
      console.error("Error loading channels:", error);
      toast.error("Error al cargar los canales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const handleAddChannel = async (channelData: Omit<ChannelType, 'id'>) => {
    try {
      await createChannel(channelData);
      toast.success("Canal añadido correctamente");
      loadChannels();
      setShowAddDialog(false);
    } catch (error) {
      console.error("Error adding channel:", error);
      toast.error("Error al añadir el canal");
    }
  };

  const handleEditChannel = (channel: ChannelType) => {
    setEditingChannel(channel);
  };

  const handleUpdateChannel = async (channelData: ChannelType) => {
    try {
      await updateChannel(channelData);
      toast.success("Canal actualizado correctamente");
      loadChannels();
      setEditingChannel(null);
    } catch (error) {
      console.error("Error updating channel:", error);
      toast.error("Error al actualizar el canal");
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este canal? Esta acción también eliminará todos los programas asociados.")) {
      return;
    }
    
    try {
      await deleteChannel(id);
      toast.success("Canal eliminado correctamente");
      loadChannels();
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast.error("Error al eliminar el canal");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Canales de Televisión</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>Añadir Canal</Button>
        </div>
        <CardDescription>
          Administra los canales de televisión disponibles en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ChannelLoadingState />
        ) : channels.length === 0 ? (
          <ChannelEmptyState />
        ) : (
          <ChannelsTable 
            channels={channels} 
            onEdit={handleEditChannel}
            onDelete={handleDeleteChannel}
          />
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={loadChannels}>Refrescar</Button>
      </CardFooter>

      {/* Add Channel Dialog */}
      <ChannelFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddChannel}
        title="Añadir Canal"
      />

      {/* Edit Channel Dialog */}
      {editingChannel && (
        <ChannelFormDialog
          open={!!editingChannel}
          onOpenChange={(open) => {
            if (!open) setEditingChannel(null);
          }}
          onSubmit={handleUpdateChannel}
          title="Editar Canal"
          channel={editingChannel}
        />
      )}
    </Card>
  );
}
