
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMediaMonitoring, MonitoringTarget } from "@/hooks/monitoring/useMediaMonitoring";
import { Plus, Tag, UserCircle, Target, Edit, Trash, Loader2 } from "lucide-react";

export function MonitoringTargetsManager() {
  const { monitoringTargets, isLoadingTargets, createTarget, isCreatingTarget } = useMediaMonitoring();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTarget, setNewTarget] = useState({
    name: "",
    type: "topic" as "client" | "topic" | "brand",
    keywords: "",
    importance: 3
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createTarget({
        name: newTarget.name,
        type: newTarget.type,
        keywords: newTarget.keywords.split(",").map(k => k.trim()).filter(Boolean),
        importance: newTarget.importance
      });
      
      // Reset form
      setNewTarget({
        name: "",
        type: "topic",
        keywords: "",
        importance: 3
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error creating target:", error);
    }
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
                
                <div className="space-y-2">
                  <Label htmlFor="keywords">Palabras Clave (separadas por comas)</Label>
                  <Input
                    id="keywords"
                    placeholder="Ej: proyecto, desarrollo, innovación"
                    value={newTarget.keywords}
                    onChange={(e) => setNewTarget({ ...newTarget, keywords: e.target.value })}
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
                    disabled={isCreatingTarget || !newTarget.name || !newTarget.keywords}
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
          <div className="text-center py-8 text-muted-foreground">
            No hay objetivos de monitoreo definidos. Añada uno para comenzar.
          </div>
        ) : (
          monitoringTargets.map((target) => (
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
                <Button size="sm" variant="ghost">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive">
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
