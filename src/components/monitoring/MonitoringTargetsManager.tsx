
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useMediaMonitoring, MonitoringTarget } from "@/hooks/monitoring/useMediaMonitoring";
import { 
  Plus, 
  Tag, 
  UserCircle, 
  Target, 
  Edit, 
  Trash, 
  Loader2, 
  X,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

export function MonitoringTargetsManager() {
  const { 
    monitoringTargets, 
    isLoadingTargets, 
    createTarget, 
    updateTarget,
    deleteTarget,
    isCreatingTarget,
    isUpdatingTarget,
    isDeletingTarget,
    categories,
    clients
  } = useMediaMonitoring();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<MonitoringTarget | null>(null);
  
  const [newTarget, setNewTarget] = useState({
    name: "",
    type: "topic" as "client" | "topic" | "brand",
    keywords: "",
    client_id: "",
    importance: 3
  });
  
  const [editTarget, setEditTarget] = useState({
    name: "",
    type: "topic" as "client" | "topic" | "brand",
    keywords: "",
    client_id: "",
    importance: 3
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createTarget({
        name: newTarget.name,
        type: newTarget.type,
        keywords: newTarget.keywords.split(",").map(k => k.trim()).filter(Boolean),
        client_id: newTarget.type === 'client' ? newTarget.client_id : undefined,
        importance: newTarget.importance
      });
      
      // Reset form
      setNewTarget({
        name: "",
        type: "topic",
        keywords: "",
        client_id: "",
        importance: 3
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al crear objetivo:", error);
    }
  };
  
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;
    
    try {
      await updateTarget({
        id: selectedTarget.id,
        updates: {
          name: editTarget.name,
          type: editTarget.type,
          keywords: editTarget.keywords.split(",").map(k => k.trim()).filter(Boolean),
          client_id: editTarget.type === 'client' ? editTarget.client_id : undefined,
          importance: editTarget.importance
        }
      });
      
      setIsEditDialogOpen(false);
      setSelectedTarget(null);
    } catch (error) {
      console.error("Error al actualizar objetivo:", error);
    }
  };
  
  const handleDelete = async () => {
    if (!selectedTarget) return;
    
    try {
      await deleteTarget(selectedTarget.id);
      setIsDeleteDialogOpen(false);
      setSelectedTarget(null);
    } catch (error) {
      console.error("Error al eliminar objetivo:", error);
    }
  };
  
  const openEditDialog = (target: MonitoringTarget) => {
    setSelectedTarget(target);
    setEditTarget({
      name: target.name,
      type: target.type,
      keywords: (target.keywords || []).join(", "),
      client_id: target.client_id || "",
      importance: target.importance || 3
    });
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (target: MonitoringTarget) => {
    setSelectedTarget(target);
    setIsDeleteDialogOpen(true);
  };
  
  const targetTypeIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <UserCircle className="h-4 w-4" />;
      case 'brand':
        return <Target className="h-4 w-4" />;
      case 'topic':
      default:
        return <Tag className="h-4 w-4" />;
    }
  };
  
  const handleClientChange = (clientId: string) => {
    // Cuando se selecciona un cliente, autocompletamos las palabras clave con las del cliente
    const selectedClient = clients.find(client => client.id === clientId);
    
    if (selectedClient && selectedClient.keywords && selectedClient.keywords.length > 0) {
      setNewTarget(prev => ({
        ...prev,
        client_id: clientId,
        keywords: selectedClient.keywords?.join(", ") || prev.keywords,
      }));
    } else {
      setNewTarget(prev => ({
        ...prev,
        client_id: clientId
      }));
    }
  };
  
  const handleEditClientChange = (clientId: string) => {
    const selectedClient = clients.find(client => client.id === clientId);
    
    if (selectedClient && selectedClient.keywords && selectedClient.keywords.length > 0) {
      setEditTarget(prev => ({
        ...prev,
        client_id: clientId,
        keywords: selectedClient.keywords?.join(", ") || prev.keywords,
      }));
    } else {
      setEditTarget(prev => ({
        ...prev,
        client_id: clientId
      }));
    }
  };
  
  if (isLoadingTargets) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Objetivos de Monitoreo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-md">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Objetivos de Monitoreo</CardTitle>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Añadir objetivo
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <Card className="border border-dashed border-primary/50 mb-4">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Objetivo</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Proyecto ABC"
                      value={newTarget.name}
                      onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo de Objetivo</Label>
                    <RadioGroup 
                      value={newTarget.type} 
                      onValueChange={(value) => setNewTarget({ ...newTarget, type: value as "client" | "topic" | "brand" })}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="topic" id="topic" />
                        <Label htmlFor="topic">Tema</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="brand" id="brand" />
                        <Label htmlFor="brand">Marca</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="client" id="client" />
                        <Label htmlFor="client">Cliente</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {newTarget.type === 'client' && (
                    <div className="space-y-2">
                      <Label htmlFor="client">Cliente</Label>
                      <Select 
                        value={newTarget.client_id} 
                        onValueChange={handleClientChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="keywords">Palabras Clave (separadas por comas)</Label>
                    <Textarea
                      id="keywords"
                      placeholder="Ej: proyecto, desarrollo, innovación"
                      value={newTarget.keywords}
                      onChange={(e) => setNewTarget({ ...newTarget, keywords: e.target.value })}
                      className="min-h-[80px]"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={isCreatingTarget || !newTarget.name || !newTarget.keywords || (newTarget.type === 'client' && !newTarget.client_id)}
                    >
                      {isCreatingTarget ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        'Guardar Objetivo'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {monitoringTargets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p>No hay objetivos de monitoreo definidos. Añada uno para comenzar.</p>
            </div>
          ) : (
            monitoringTargets.map((target: MonitoringTarget) => (
              <div key={target.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-md">
                <div className="space-y-2 mb-2 sm:mb-0">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="font-normal">
                      <span className="flex items-center space-x-1">
                        {targetTypeIcon(target.type)}
                        <span>
                          {target.type === 'client' ? 'Cliente' : 
                          target.type === 'brand' ? 'Marca' : 'Tema'}
                        </span>
                      </span>
                    </Badge>
                    <h3 className="font-medium">{target.name}</h3>
                    {target.clientName && (
                      <Badge variant="secondary" className="ml-2">
                        {target.clientName}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {target.keywords && target.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {target.keywords.map((keyword: string, idx: number) => (
                          <Badge 
                            key={idx}
                            variant="secondary" 
                            className="text-xs bg-primary/10"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => openEditDialog(target)}
                    disabled={isUpdatingTarget || isDeletingTarget}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-destructive"
                    onClick={() => openDeleteDialog(target)}
                    disabled={isUpdatingTarget || isDeletingTarget}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      
      {/* Dialog para editar objetivo */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Objetivo de Monitoreo</DialogTitle>
            <DialogDescription>
              Actualice los detalles del objetivo seleccionado.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editTarget.name}
                onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Objetivo</Label>
              <RadioGroup 
                value={editTarget.type} 
                onValueChange={(value) => setEditTarget({ ...editTarget, type: value as "client" | "topic" | "brand" })}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="topic" id="edit-topic" />
                  <Label htmlFor="edit-topic">Tema</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="brand" id="edit-brand" />
                  <Label htmlFor="edit-brand">Marca</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="edit-client" />
                  <Label htmlFor="edit-client">Cliente</Label>
                </div>
              </RadioGroup>
            </div>
            
            {editTarget.type === 'client' && (
              <div className="space-y-2">
                <Label htmlFor="edit-client-select">Cliente</Label>
                <Select 
                  value={editTarget.client_id} 
                  onValueChange={handleEditClientChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="edit-keywords">Palabras Clave (separadas por comas)</Label>
              <Textarea
                id="edit-keywords"
                value={editTarget.keywords}
                onChange={(e) => setEditTarget({ ...editTarget, keywords: e.target.value })}
                className="min-h-[80px]"
                required
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isUpdatingTarget || !editTarget.name || !editTarget.keywords || (editTarget.type === 'client' && !editTarget.client_id)}
              >
                {isUpdatingTarget ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para confirmar eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el objetivo de monitoreo
              "{selectedTarget?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingTarget}
            >
              {isDeletingTarget ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
