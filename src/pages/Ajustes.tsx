import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings2, Bell, User, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Ajustes = () => {
  const { toast } = useToast();

  const handleSettingChange = (setting: string, enabled: boolean) => {
    toast({
      title: "Configuración actualizada",
      description: `${setting} ha sido ${enabled ? 'activado' : 'desactivado'}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings2 className="h-8 w-8" />
          Ajustes
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Administra tus preferencias y configuración de la cuenta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cuenta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cuenta
            </CardTitle>
            <CardDescription>
              Gestiona tu información personal y preferencias de cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-notifications">Notificaciones por email</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Recibe actualizaciones importantes por correo
                </span>
                <Switch
                  id="email-notifications"
                  onCheckedChange={(checked) => 
                    handleSettingChange("Notificaciones por email", checked)
                  }
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="two-factor">Autenticación de dos factores</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Aumenta la seguridad de tu cuenta
                </span>
                <Switch
                  id="two-factor"
                  onCheckedChange={(checked) => 
                    handleSettingChange("Autenticación de dos factores", checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura cómo y cuándo quieres recibir notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="push-notifications">Notificaciones push</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Recibe alertas en tiempo real
                </span>
                <Switch
                  id="push-notifications"
                  onCheckedChange={(checked) => 
                    handleSettingChange("Notificaciones push", checked)
                  }
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="alerts">Alertas de menciones</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Notificaciones cuando te mencionan
                </span>
                <Switch
                  id="alerts"
                  onCheckedChange={(checked) => 
                    handleSettingChange("Alertas de menciones", checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacidad */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacidad y Seguridad
            </CardTitle>
            <CardDescription>
              Controla tu privacidad y configura las opciones de seguridad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activity-log">Registro de actividad</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Mantén un registro de la actividad de tu cuenta
                </span>
                <Switch
                  id="activity-log"
                  onCheckedChange={(checked) => 
                    handleSettingChange("Registro de actividad", checked)
                  }
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="data-sharing">Compartir datos de uso</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Ayúdanos a mejorar compartiendo datos de uso anónimos
                </span>
                <Switch
                  id="data-sharing"
                  onCheckedChange={(checked) => 
                    handleSettingChange("Compartir datos de uso", checked)
                  }
                />
              </div>
            </div>
            <div className="pt-4">
              <Button variant="destructive">
                Eliminar cuenta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Ajustes;