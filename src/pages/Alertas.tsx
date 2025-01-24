import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Settings } from "lucide-react";

const alertas = [
  {
    id: 1,
    tipo: "TV",
    medio: "Canal 13",
    programa: "Teletrece",
    texto: "Mención de cliente en segmento de noticias",
    timestamp: "Hace 5 minutos",
    prioridad: "alta",
  },
  {
    id: 2,
    tipo: "Radio",
    medio: "Cooperativa",
    programa: "Primera Edición",
    texto: "Entrevista relacionada con el sector",
    timestamp: "Hace 15 minutos",
    prioridad: "media",
  },
  {
    id: 3,
    tipo: "Prensa",
    medio: "El Mercurio",
    programa: "Economía",
    texto: "Artículo sobre la industria",
    timestamp: "Hace 1 hora",
    prioridad: "baja",
  },
];

const Alertas = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alertas</h1>
          <p className="text-gray-500 mt-2">
            Centro de notificaciones y alertas en tiempo real
          </p>
        </div>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6">
        {alertas.map((alerta) => (
          <Card key={alerta.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary-50 p-2 rounded-lg">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          alerta.prioridad === "alta"
                            ? "destructive"
                            : alerta.prioridad === "media"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {alerta.tipo}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {alerta.timestamp}
                      </span>
                    </div>
                    <h3 className="font-medium mt-1">{alerta.texto}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {alerta.medio} - {alerta.programa}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Ver Detalle
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Alertas;