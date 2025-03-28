
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function RateTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Canal</TableHead>
        <TableHead>Programa</TableHead>
        <TableHead className="hidden md:table-cell">Días</TableHead>
        <TableHead className="hidden md:table-cell">Horario</TableHead>
        <TableHead className="hidden sm:table-cell">15s</TableHead>
        <TableHead>30s</TableHead>
        <TableHead className="hidden sm:table-cell">45s</TableHead>
        <TableHead>60s</TableHead>
        <TableHead className="text-right">Acciones</TableHead>
      </TableRow>
    </TableHeader>
  );
}
