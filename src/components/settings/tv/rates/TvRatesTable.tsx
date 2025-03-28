
import { useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TvRateType, ChannelType, ProgramType } from "@/services/tv/types";
import { TvRateForm } from "./TvRateForm";
import { Edit, Trash2 } from "lucide-react";

interface TvRatesTableProps {
  rates: TvRateType[];
  channels: ChannelType[];
  programs: ProgramType[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rateData: Omit<TvRateType, 'created_at' | 'channel_name' | 'program_name'>) => Promise<void>;
  onCancelEdit: () => void;
  editingId: string | null;
}

export function TvRatesTable({
  rates,
  channels,
  programs,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editingId
}: TvRatesTableProps) {
  // Function to format day codes
  const formatDays = (days: string[]) => {
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
  
  // Function to format currency
  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('es-PR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (rates.length === 0) {
    return (
      <div className="bg-muted/30 rounded-md p-8 text-center">
        <p className="text-muted-foreground">No hay tarifas que mostrar</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal</TableHead>
            <TableHead>Programa</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Horario</TableHead>
            <TableHead className="text-right">15s</TableHead>
            <TableHead className="text-right">30s</TableHead>
            <TableHead className="text-right">45s</TableHead>
            <TableHead className="text-right">60s</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map(rate => (
            editingId === rate.id ? (
              <TableRow key={rate.id} className="bg-muted/50">
                <TableCell colSpan={9}>
                  <TvRateForm
                    channels={channels}
                    programs={programs}
                    onSave={onSaveEdit}
                    onCancel={onCancelEdit}
                    editMode={true}
                    data={rate}
                  />
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={rate.id}>
                <TableCell>{rate.channel_name}</TableCell>
                <TableCell>{rate.program_name}</TableCell>
                <TableCell>{formatDays(rate.days)}</TableCell>
                <TableCell>{rate.start_time} - {rate.end_time}</TableCell>
                <TableCell className="text-right">{formatCurrency(rate.rate_15s)}</TableCell>
                <TableCell className="text-right">{formatCurrency(rate.rate_30s)}</TableCell>
                <TableCell className="text-right">{formatCurrency(rate.rate_45s)}</TableCell>
                <TableCell className="text-right">{formatCurrency(rate.rate_60s)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onEdit(rate.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onDelete(rate.id)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
