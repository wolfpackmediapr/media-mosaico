
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function RateTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>MEDIO</TableHead>
        <TableHead>PROGRAMA</TableHead>
        <TableHead>DÍAS</TableHead>
        <TableHead>INICIO</TableHead>
        <TableHead>FIN</TableHead>
        <TableHead className="text-right">15S</TableHead>
        <TableHead className="text-right">30S</TableHead>
        <TableHead className="text-right">45S</TableHead>
        <TableHead className="text-right">60S</TableHead>
        <TableHead className="text-right">ACCIONES</TableHead>
      </TableRow>
    </TableHeader>
  );
}
