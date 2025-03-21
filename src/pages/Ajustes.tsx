import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings2, Bell, User, Shield, Tv, Radio, Newspaper, Users, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { seedTvData } from "@/services/tv";

const Ajustes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize TV data if needed
  useEffect(() => {
    const initTvData = async () => {
      try {
        await seedTvData();
      } catch (error) {
        console.error("Error initializing TV data:", error);
      }
    };
    
    initTvData();
  }, []);

  const handleSettingChange = (setting: string, enabled: boolean) => {
    toast({
      title: "Configuración actualizada",
      description: `${setting} ha sido ${enabled ? 'activado' : 'desactivado'}.`,
    });
  };

  const configSections = [
    {
      title: "General",
      description: "Administrar medios y categorías",
      icon: Settings2,
      path: "/ajustes/general"
    },
    {
      title: "Usuarios de Administración",
      description: "Gestionar usuarios y permisos",
      icon: Users,
      path: "/ajustes/usuarios"
    },
    {
      title: "Clientes",
      description: "Gestionar clientes y sus niveles de acceso",
      icon: User,
      path: "/ajustes/clientes"
    },
    {
      title: "Prensa",
      description: "Configurar géneros, fuentes, secciones y tarifas",
      icon: Newspaper,
      path: "/ajustes/prensa"
    },
    {
      title: "Radio",
      description: "Administrar programas y tarifas de radio",
      icon: Radio,
      path: "/ajustes/radio"
    },
    {
      title: "TV",
      description: "Administrar canales y programas de TV",
      icon: Tv,
      path: "/ajustes/tv"
    },
    {
      title: "Participantes de la Noticia",
      description: "Gestionar participantes y sus categorías",
      icon: Users,
      path: "/ajustes/participantes"
    },
    {
      title: "Instituciones y Agencias",
      description: "Administrar instituciones, categorías y agencias",
      icon: Building2,
      path: "/ajustes/instituciones"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings2 className="h-8 w-8" />
          Configuración
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Administra las configuraciones globales del sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {configSections.map((section) => (
          <Card key={section.title} className="overflow-hidden hover:shadow-md transition-all">
            <Link to={section.path} className="block h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <section.icon className="h-5 w-5" />
                  {section.title}
                </CardTitle>
                <CardDescription>
                  {section.description}
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>

      <Separator className="my-8" />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Sistema
            </CardTitle>
            <CardDescription>
              Configuraciones básicas del sistema
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
      </div>
    </div>
  );
};

export default Ajustes;
