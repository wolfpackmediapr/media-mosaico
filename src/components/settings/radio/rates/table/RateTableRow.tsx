
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pen, Trash2 } from "lucide-react";
import { RadioRateType } from "@/services/radio/types";
import { TableCell, TableRow } from "@/components/ui/table";

interface RateTableRowProps {
  rate: RadioRateType;
  isEditing: boolean;
  editedRate: RadioRateType | null;
  onEdit: (rate: RadioRateType) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onInputChange: (field: keyof RadioRateType, value: any) => void;
}

export function RateTableRow({
  rate,
  isEditing,
  editedRate,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  onInputChange,
}: RateTableRowProps) {
  // Format days array for display
  const formatDays = (days: string[]) => {
    const dayMap: Record<string, string> = {
      'L': 'L', 'K': 'M', 'M': 'X', 'J': 'J', 'V': 'V', 'S': 'S', 'D': 'D'
    };
    
    return days.map(day => dayMap[day] || day).join(', ');
  };

  // Format price with currency
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '-';
    return `$${price}`;
  };

  return (
    <TableRow>
      {isEditing ? (
        // Editing mode
        <>
          <TableCell>{rate.station_name}</TableCell>
          <TableCell>{rate.program_name}</TableCell>
          <TableCell>{formatDays(rate.days)}</TableCell>
          <TableCell>
            <Input
              type="time"
              value={editedRate?.start_time || rate.start_time}
              onChange={(e) => onInputChange('start_time', e.target.value)}
              className="w-24"
            />
          </TableCell>
          <TableCell>
            <Input
              type="time"
              value={editedRate?.end_time || rate.end_time}
              onChange={(e) => onInputChange('end_time', e.target.value)}
              className="w-24"
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              value={editedRate?.rate_15s || ''}
              onChange={(e) => onInputChange('rate_15s', parseInt(e.target.value) || null)}
              className="w-20 text-right"
              placeholder="-"
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              value={editedRate?.rate_30s || ''}
              onChange={(e) => onInputChange('rate_30s', parseInt(e.target.value) || null)}
              className="w-20 text-right"
              placeholder="-"
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              value={editedRate?.rate_45s || ''}
              onChange={(e) => onInputChange('rate_45s', parseInt(e.target.value) || null)}
              className="w-20 text-right"
              placeholder="-"
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              value={editedRate?.rate_60s || ''}
              onChange={(e) => onInputChange('rate_60s', parseInt(e.target.value) || null)}
              className="w-20 text-right"
              placeholder="-"
            />
          </TableCell>
          <TableCell className="flex justify-end space-x-2">
            <Button size="sm" variant="default" onClick={onSave}>
              Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </TableCell>
        </>
      ) : (
        // View mode
        <>
          <TableCell>{rate.station_name}</TableCell>
          <TableCell>{rate.program_name}</TableCell>
          <TableCell>{formatDays(rate.days)}</TableCell>
          <TableCell>{rate.start_time}</TableCell>
          <TableCell>{rate.end_time}</TableCell>
          <TableCell className="text-right">{formatPrice(rate.rate_15s)}</TableCell>
          <TableCell className="text-right">{formatPrice(rate.rate_30s)}</TableCell>
          <TableCell className="text-right">{formatPrice(rate.rate_45s)}</TableCell>
          <TableCell className="text-right">{formatPrice(rate.rate_60s)}</TableCell>
          <TableCell className="flex justify-end space-x-2">
            <Button size="icon" variant="ghost" onClick={() => onEdit(rate)}>
              <Pen className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(rate.id!)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
