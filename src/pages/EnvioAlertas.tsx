
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const sentAlerts = [
  {
    id: 1,
    title: "Alerta de Crisis",
    message: "Comunicado urgente sobre situación en desarrollo",
    status: "sent",
    timestamp: "Hace 1 hora",
  },
  {
    id: 2,
    title: "Actualización Important",
    message: "Nuevas métricas disponibles para revisión",
    status: "pending",
    timestamp: "Hace 30 minutos",
  },
];

const EnvioAlertas = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Envío de Alertas</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Gestiona y envía alertas importantes a tu equipo
        </p>
      </div>

      <Card className="dark:border-gray-800">
        <CardHeader>
          <CardTitle>Nueva Alerta</CardTitle>
          <CardDescription>Completa el formulario para enviar una nueva alerta</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Título
              </label>
              <Input
                id="title"
                placeholder="Ingresa el título de la alerta"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Mensaje
              </label>
              <Textarea
                id="message"
                placeholder="Escribe el contenido de la alerta"
                rows={4}
              />
            </div>
            <div className="flex justify-end">
              <Button>
                Enviar Alerta
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Historial de Alertas</h2>
        <div className="space-y-4">
          {sentAlerts.map((alert) => (
            <Alert
              key={alert.id}
              className="dark:border-gray-800 dark:bg-gray-900"
            >
              <Bell className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {alert.title}
                {alert.status === "sent" ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
              </AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>{alert.message}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {alert.timestamp}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnvioAlertas;
