
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { ProgramType, StationType } from "@/services/radio/types";

interface ProgramsTableProps {
  programs: ProgramType[];
  stations: StationType[];
  onEdit: (program: ProgramType) => void;
  onDelete: (id: string) => void;
}

export function ProgramsTable({ programs, stations, onEdit, onDelete }: ProgramsTableProps) {
  // Helper to get station name by id
  const getStationName = (stationId: string): string => {
    const station = stations.find(s => s.id === stationId);
    return station ? station.name : 'Desconocida';
  };
  
  // Format days for display
  const formatDays = (days: string[]): string => {
    const dayMap: Record<string, string> = {
      'Mon': 'Lun',
      'Tue': 'Mar',
      'Wed': 'Mié',
      'Thu': 'Jue',
      'Fri': 'Vie',
      'Sat': 'Sáb',
      'Sun': 'Dom'
    };
    
    return days.map(day => dayMap[day] || day).join(', ');
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Estación</TableHead>
            <TableHead>Horario</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Locutor</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.map((program) => (
            <TableRow key={program.id}>
              <TableCell className="font-medium">{program.name}</TableCell>
              <TableCell>{getStationName(program.station_id)}</TableCell>
              <TableCell>
                {program.start_time} - {program.end_time}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {formatDays(program.days)}
                </div>
              </TableCell>
              <TableCell>{program.host || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(program)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(program.id!)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
