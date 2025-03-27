
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileBarChart, FileText, Download } from "lucide-react";

interface ReportStatsProps {
  totalMentions: number;
  reportsGenerated: number;
  downloads: number;
}

const ReportStats = ({ totalMentions, reportsGenerated, downloads }: ReportStatsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Total Menciones</CardTitle>
          <FileBarChart className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMentions}</div>
          <p className="text-xs text-gray-500">+12% vs mes anterior</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Reportes Generados</CardTitle>
          <FileText className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{reportsGenerated}</div>
          <p className="text-xs text-gray-500">Última semana</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Descargas</CardTitle>
          <Download className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{downloads}</div>
          <p className="text-xs text-gray-500">Esta semana</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportStats;
