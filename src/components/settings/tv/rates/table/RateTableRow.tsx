
import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { TvRateType, ChannelType, ProgramType } from "@/services/tv/types";
import { TvRateForm } from "../TvRateForm";

interface RateTableRowProps {
  rate: TvRateType;
  channels: ChannelType[];
  programs: ProgramType[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rateData: Omit<TvRateType, 'created_at' | 'channel_name' | 'program_name'>) => void;
  onCancelEdit: () => void;
  isEditing: boolean;
}

// Map for short day names
const dayMap: Record<string, string> = {
  monday: "L",
  tuesday: "K",
  wednesday: "M",
  thursday: "J",
  friday: "V",
  saturday: "S",
  sunday: "D",
};

export function RateTableRow({
  rate,
  channels,
  programs,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  isEditing,
}: RateTableRowProps) {
  if (isEditing) {
    return (
      <TableRow>
        <TableCell colSpan={9}>
          <TvRateForm
            channels={channels}
            programs={programs}
            initialData={rate}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
          />
        </TableCell>
      </TableRow>
    );
  }

  // Format days for display
  const formattedDays = rate.days
    .map((day) => dayMap[day] || day)
    .join(", ");

  // Format time range
  const timeRange = `${rate.start_time} - ${rate.end_time}`;

  // Format rates
  const formatRate = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <TableRow>
      <TableCell>{rate.channel_name}</TableCell>
      <TableCell>{rate.program_name}</TableCell>
      <TableCell className="hidden md:table-cell">{formattedDays}</TableCell>
      <TableCell className="hidden md:table-cell">{timeRange}</TableCell>
      <TableCell className="hidden sm:table-cell">{formatRate(rate.rate_15s)}</TableCell>
      <TableCell>{formatRate(rate.rate_30s)}</TableCell>
      <TableCell className="hidden sm:table-cell">{formatRate(rate.rate_45s)}</TableCell>
      <TableCell>{formatRate(rate.rate_60s)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(rate.id)}
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(rate.id)}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
