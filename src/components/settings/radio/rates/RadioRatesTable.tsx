
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Pen, Trash2 } from "lucide-react";
import { RadioRateType } from "@/services/radio/types";
import { useState } from "react";

interface RadioRatesTableProps {
  rates: RadioRateType[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rate: RadioRateType) => void;
  onCancelEdit: () => void;
  editingId: string | null;
}

export function RadioRatesTable({
  rates,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editingId,
}: RadioRatesTableProps) {
  const [editedRate, setEditedRate] = useState<RadioRateType | null>(null);

  // Initialize edited rate when editing starts
  const handleEdit = (rate: RadioRateType) => {
    setEditedRate({...rate});
    onEdit(rate.id!);
  };

  // Update edited rate when input changes
  const handleInputChange = (field: keyof RadioRateType, value: any) => {
    if (editedRate) {
      setEditedRate({...editedRate, [field]: value});
    }
  };

  // Handle save
  const handleSave = () => {
    if (editedRate) {
      onSaveEdit(editedRate);
    }
  };

  // Handle cancel and reset edited rate
  const handleCancel = () => {
    setEditedRate(null);
    onCancelEdit();
  };

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
    <div className="border rounded-md overflow-hidden">
      <Table>
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
        <TableBody>
          {rates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                No hay tarifas para mostrar
              </TableCell>
            </TableRow>
          ) : (
            rates.map((rate) => (
              <TableRow key={rate.id}>
                {editingId === rate.id ? (
                  // Editing mode
                  <>
                    <TableCell>{rate.station_name}</TableCell>
                    <TableCell>{rate.program_name}</TableCell>
                    <TableCell>{formatDays(rate.days)}</TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={editedRate?.start_time || rate.start_time}
                        onChange={(e) => handleInputChange('start_time', e.target.value)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={editedRate?.end_time || rate.end_time}
                        onChange={(e) => handleInputChange('end_time', e.target.value)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editedRate?.rate_15s || ''}
                        onChange={(e) => handleInputChange('rate_15s', parseInt(e.target.value) || null)}
                        className="w-20 text-right"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editedRate?.rate_30s || ''}
                        onChange={(e) => handleInputChange('rate_30s', parseInt(e.target.value) || null)}
                        className="w-20 text-right"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editedRate?.rate_45s || ''}
                        onChange={(e) => handleInputChange('rate_45s', parseInt(e.target.value) || null)}
                        className="w-20 text-right"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editedRate?.rate_60s || ''}
                        onChange={(e) => handleInputChange('rate_60s', parseInt(e.target.value) || null)}
                        className="w-20 text-right"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell className="flex justify-end space-x-2">
                      <Button size="sm" variant="default" onClick={handleSave}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel}>
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
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(rate)}>
                        <Pen className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(rate.id!)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
