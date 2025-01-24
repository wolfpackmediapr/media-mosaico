import { Bell, BellDot, Flag, MessageSquare } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const alerts = [
  {
    id: 1,
    title: "Nueva mención en medios",
    description: "Se ha detectado una nueva mención de su marca en Canal 13",
    type: "media",
    status: "new",
    timestamp: "Hace 5 minutos",
  },
  {
    id: 2,
    title: "Alerta de sentimiento negativo",
    description: "Se ha detectado un incremento en menciones negativas en Twitter",
    type: "sentiment",
    status: "urgent",
    timestamp: "Hace 30 minutos",
  },
  {
    id: 3,
    title: "Actualización de competidor",
    description: "Nueva campaña detectada de su competidor principal",
    type: "competitor",
    status: "info",
    timestamp: "Hace 2 horas",
  },
];

const Alertas = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Alertas</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Gestión de notificaciones y alertas importantes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellDot className="h-5 w-5 text-red-500" />
              <span>Alertas Nuevas</span>
            </CardTitle>
            <CardDescription>Notificaciones sin revisar</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">3</span>
          </CardContent>
        </Card>

        <Card className="dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-yellow-500" />
              <span>Alertas Urgentes</span>
            </CardTitle>
            <CardDescription>Requieren atención inmediata</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">1</span>
          </CardContent>
        </Card>

        <Card className="dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <span>Total Menciones</span>
            </CardTitle>
            <CardDescription>En las últimas 24 horas</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">24</span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            className="dark:border-gray-800 dark:bg-gray-900"
          >
            <Bell className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              {alert.title}
              <Badge
                variant={
                  alert.status === "urgent"
                    ? "destructive"
                    : alert.status === "new"
                    ? "default"
                    : "secondary"
                }
                className="ml-2"
              >
                {alert.status}
              </Badge>
            </AlertTitle>
            <AlertDescription className="flex justify-between items-center">
              <span>{alert.description}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {alert.timestamp}
              </span>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
};

export default Alertas;