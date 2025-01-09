import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Radio, Tv, Newspaper } from "lucide-react";

const stats = [
  {
    title: "Clips de TV",
    value: "24",
    description: "Monitoreados hoy",
    icon: Tv,
    trend: "+12%",
  },
  {
    title: "Segmentos de Radio",
    value: "156",
    description: "Monitoreados hoy",
    icon: Radio,
    trend: "+5%",
  },
  {
    title: "Artículos de Prensa",
    value: "89",
    description: "Monitoreados hoy",
    icon: Newspaper,
    trend: "+8%",
  },
  {
    title: "Alertas Activas",
    value: "12",
    description: "En las últimas 24h",
    icon: BarChart2,
    trend: "-2%",
  },
];

const Index = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">¡Bienvenido!</h1>
        <p className="text-gray-500 mt-2">
          Aquí está el resumen de la actividad de monitoreo de hoy
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{stat.description}</p>
                  <span
                    className={`text-xs font-medium ${
                      stat.trend.startsWith("+")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stat.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Index;