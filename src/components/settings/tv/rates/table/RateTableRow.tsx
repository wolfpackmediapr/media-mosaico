
import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { TvRateType, ChannelType, ProgramType } from "@/services/tv/types";
import { formatDays } from "@/utils/date-utils";
import { TvRateForm } from "../TvRateForm";

interface RateTableRowProps {
  rate: TvRateType;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rateData: Omit<TvRateType, "created_at" | "channel_name" | "program_name">) => Promise<void>;
  onCancelEdit: () => void;
  isEditing: boolean;
  channels: ChannelType[];
  programs: ProgramType[];
}

export function RateTableRow({
  rate,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  isEditing,
  channels,
  programs
}: RateTableRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete(rate.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  };

  if (isEditing) {
    return (
      <TableRow>
        <TableCell colSpan={10}>
          <TvRateForm 
            channels={channels}
            programs={programs}
            data={rate}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            editMode={true}
          />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{rate.channel_name}</TableCell>
      <TableCell>{rate.program_name}</TableCell>
      <TableCell>{formatDays(rate.days)}</TableCell>
      <TableCell>{rate.start_time} - {rate.end_time}</TableCell>
      <TableCell className="text-right">{rate.rate_15s ? `$${rate.rate_15s.toFixed(2)}` : '-'}</TableCell>
      <TableCell className="text-right">{rate.rate_30s ? `$${rate.rate_30s.toFixed(2)}` : '-'}</TableCell>
      <TableCell className="text-right">{rate.rate_45s ? `$${rate.rate_45s.toFixed(2)}` : '-'}</TableCell>
      <TableCell className="text-right">{rate.rate_60s ? `$${rate.rate_60s.toFixed(2)}` : '-'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(rate.id)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant={confirmDelete ? "destructive" : "ghost"}
            size="icon"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
