
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChevronRight, Filter, Loader2, Settings, TestTube, Wand2 } from "lucide-react";
import { testNotificationSettings } from "@/services/notifications/contentNotificationService";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferenceWizardProps {
  clients: { id: string; name: string }[];
  onSave: (preferences: any) => void;
  isSubmitting: boolean;
}

const NotificationPreferenceWizard: React.FC<NotificationPreferenceWizardProps> = ({
  clients,
  onSave,
  isSubmitting
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formState, setFormState] = useState({
    client_id: "",
    sources: ["news", "social", "radio", "tv", "press"],
    threshold: 1,
    notification_channels: ["in_app"],
    frequency: "daily",
    is_active: true
  });

  const updateFormState = (key: string, value: any) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const handleSourceToggle = (source: string) => {
    setFormState(prev => {
      if (prev.sources.includes(source)) {
        return { ...prev, sources: prev.sources.filter(s => s !== source) };
      } else {
        return { ...prev, sources: [...prev.sources, source] };
      }
    });
  };

  const handleChannelToggle = (channel: string) => {
    setFormState(prev => {
      if (prev.notification_channels.includes(channel)) {
        return { ...prev, notification_channels: prev.notification_channels.filter(c => c !== channel) };
      } else {
        return { ...prev, notification_channels: [...prev.notification_channels, channel] };
      }
    });
  };

  const nextStep = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    onSave(formState);
  };

  const handleTestSettings = async () => {
    setIsLoading(true);
    try {
      const results = await testNotificationSettings(formState);
      setTestResults(results);
      toast({
        title: "Configuración probada",
        description: `${results.count || 0} notificaciones serían generadas con estos ajustes.`,
      });
    } catch (error) {
      console.error("Error testing settings:", error);
      toast({
        title: "Error",
        description: "No se pudieron probar los ajustes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Asistente de Configuración de Notificaciones</CardTitle>
        <CardDescription>
          Configure las preferencias de notificación de manera óptima para cada cliente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div 
            className="h-2 rounded-full bg-primary transition-all" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-center mb-6 space-x-2">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`flex h-8 w-8 rounded-full items-center justify-center border transition-colors ${
                s === step 
                  ? "border-primary bg-primary text-primary-foreground" 
                  : s < step 
                    ? "border-primary bg-primary/20 text-primary" 
                    : "border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Cliente y Fuentes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Seleccione el cliente y las fuentes de contenido para las notificaciones
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select 
                  value={formState.client_id} 
                  onValueChange={(value) => updateFormState("client_id", value)}
                >
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Seleccione un cliente" />
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
              
              <div className="space-y-2">
                <Label>Fuentes de Contenido</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { id: "news", label: "Noticias" },
                    { id: "social", label: "Redes Sociales" },
                    { id: "radio", label: "Radio" },
                    { id: "tv", label: "TV" },
                    { id: "press", label: "Prensa Escrita" }
                  ].map((source) => (
                    <Badge 
                      key={source.id}
                      variant={formState.sources.includes(source.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleSourceToggle(source.id)}
                    >
                      {source.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuración de Sensibilidad</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ajuste el umbral de relevancia para las notificaciones
            </p>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label htmlFor="threshold">Umbral de Notificación</Label>
                  <span className="text-sm font-medium">{formState.threshold}</span>
                </div>
                <Slider
                  id="threshold"
                  min={1}
                  max={5}
                  step={1}
                  value={[formState.threshold]}
                  onValueChange={(value) => updateFormState("threshold", value[0])}
                  className="my-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Todas las menciones</span>
                  <span>Solo menciones importantes</span>
                </div>
              </div>
              
              <div className="pt-4 space-y-2">
                <Label>Frecuencia de Entrega</Label>
                <Select 
                  value={formState.frequency} 
                  onValueChange={(value) => updateFormState("frequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Tiempo real</SelectItem>
                    <SelectItem value="hourly">Cada hora</SelectItem>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Canales de Notificación</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Seleccione cómo quiere recibir las notificaciones
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="in_app" className="flex items-center space-x-2">
                  <span>En la aplicación</span>
                </Label>
                <Switch 
                  id="in_app" 
                  checked={formState.notification_channels.includes("in_app")}
                  onCheckedChange={() => handleChannelToggle("in_app")}
                  disabled
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <span>Correo electrónico</span>
                </Label>
                <Switch 
                  id="email" 
                  checked={formState.notification_channels.includes("email")}
                  onCheckedChange={() => handleChannelToggle("email")}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="sms" className="flex items-center space-x-2">
                  <span>SMS</span>
                </Label>
                <Switch 
                  id="sms" 
                  checked={formState.notification_channels.includes("sms")}
                  onCheckedChange={() => handleChannelToggle("sms")}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="push" className="flex items-center space-x-2">
                  <span>Notificaciones push</span>
                </Label>
                <Switch 
                  id="push" 
                  checked={formState.notification_channels.includes("push")}
                  onCheckedChange={() => handleChannelToggle("push")}
                />
              </div>
              
              <div className="pt-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="active" className="flex items-center space-x-2">
                    <span>Activar notificaciones</span>
                  </Label>
                  <Switch 
                    id="active" 
                    checked={formState.is_active}
                    onCheckedChange={(checked) => updateFormState("is_active", checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Probar y Confirmar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Pruebe la configuración y confirme los ajustes
            </p>
            
            <div className="space-y-4">
              <Card className="bg-gray-50 dark:bg-gray-900">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Resumen de Configuración</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Cliente:</dt>
                      <dd className="text-sm font-medium">
                        {clients.find(c => c.id === formState.client_id)?.name || "No seleccionado"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Fuentes:</dt>
                      <dd className="text-sm font-medium">
                        {formState.sources.length} seleccionadas
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Umbral:</dt>
                      <dd className="text-sm font-medium">{formState.threshold}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Frecuencia:</dt>
                      <dd className="text-sm font-medium">{formState.frequency}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Canales:</dt>
                      <dd className="text-sm font-medium">
                        {formState.notification_channels.join(", ")}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Estado:</dt>
                      <dd className="text-sm font-medium">
                        {formState.is_active ? "Activo" : "Inactivo"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
              
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleTestSettings}
                  disabled={isLoading || !formState.client_id}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Probar Configuración
                    </>
                  )}
                </Button>
              </div>
              
              {testResults && (
                <div className="border rounded-md p-4 bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm">
                    Con esta configuración, se generarían aproximadamente{" "}
                    <strong>{testResults.count || 0} notificaciones</strong>{" "}
                    basadas en el contenido histórico.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        {step > 1 ? (
          <Button variant="outline" onClick={prevStep}>Anterior</Button>
        ) : (
          <div></div>
        )}
        
        {step < 4 ? (
          <Button onClick={nextStep} disabled={step === 1 && !formState.client_id}>
            Siguiente
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formState.client_id}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Configuración"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default NotificationPreferenceWizard;
