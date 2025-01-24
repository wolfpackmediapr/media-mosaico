import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileBarChart, FileText, Download, Printer } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

const data = [
  { name: "Lun", menciones: 40 },
  { name: "Mar", menciones: 30 },
  { name: "Mie", menciones: 45 },
  { name: "Jue", menciones: 25 },
  { name: "Vie", menciones: 55 },
  { name: "Sab", menciones: 20 },
  { name: "Dom", menciones: 15 },
];

const recentReports = [
  {
    id: 1,
    name: "Reporte Semanal TV",
    date: "2024-02-20",
    type: "TV",
    mentions: 245,
  },
  {
    id: 2,
    name: "Análisis Radio Mensual",
    date: "2024-02-19",
    type: "Radio",
    mentions: 189,
  },
  {
    id: 3,
    name: "Resumen Prensa Digital",
    date: "2024-02-18",
    type: "Prensa",
    mentions: 312,
  },
];

const Reportes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 mt-2">
          Visualiza y descarga reportes de monitoreo de medios
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Menciones</CardTitle>
            <FileBarChart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">746</div>
            <p className="text-xs text-gray-500">+12% vs mes anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Reportes Generados</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-gray-500">Última semana</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Descargas</CardTitle>
            <Download className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-gray-500">Esta semana</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Menciones por Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="menciones" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reportes Recientes</CardTitle>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Menciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>{report.type}</TableCell>
                  <TableCell>{report.mentions}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reportes;