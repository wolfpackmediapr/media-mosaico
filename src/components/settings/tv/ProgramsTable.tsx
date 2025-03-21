
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { ProgramType, ChannelType } from "@/services/tv/types";

interface ProgramsTableProps {
  programs: ProgramType[];
  channels: ChannelType[];
  onEdit: (program: ProgramType) => void;
  onDelete: (id: string) => void;
}

export function ProgramsTable({ programs, channels, onEdit, onDelete }: ProgramsTableProps) {
  const getChannelName = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? `${channel.name} (${channel.code})` : 'Canal desconocido';
  };

  // Format schedule days
  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return "N/A";
    
    if (days.length === 7) return "Todos los días";

    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"].every(day => days.includes(day));
    const weekend = ["Sat", "Sun"].every(day => days.includes(day));
    
    if (weekdays && !weekend) return "Lunes a Viernes";
    if (weekend && !weekdays) return "Fines de semana";
    
    // Custom mapping for individual days
    const dayMap: Record<string, string> = {
      "Mon": "Lun",
      "Tue": "Mar",
      "Wed": "Mié",
      "Thu": "Jue",
      "Fri": "Vie",
      "Sat": "Sáb",
      "Sun": "Dom"
    };
    
    return days.map(day => dayMap[day] || day).join(", ");
  };

  // Format time
  const formatTime = (time: string) => {
    try {
      // Format HH:MM to HH:MM AM/PM
      const [hour, minute] = time.split(':').map(Number);
      if (isNaN(hour) || isNaN(minute)) return time;
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      return time;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Horario</TableHead>
            <TableHead>Días</TableHead>
            <TableHead className="text-right w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No hay programas para mostrar en esta página
              </TableCell>
            </TableRow>
          ) : (
            programs.map((program) => (
              <TableRow key={program.id}>
                <TableCell className="font-medium">{program.name}</TableCell>
                <TableCell>{getChannelName(program.channel_id)}</TableCell>
                <TableCell>
                  {formatTime(program.start_time)} - {formatTime(program.end_time)}
                </TableCell>
                <TableCell>{formatDays(program.days)}</TableCell>
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
                      onClick={() => onDelete(program.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
