
import { TableCell, TableRow } from "@/components/ui/table";

export function EmptyRatesRow() {
  return (
    <TableRow>
      <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
        No hay tarifas para mostrar
      </TableCell>
    </TableRow>
  );
}
