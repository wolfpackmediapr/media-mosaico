
import { 
  Table,
  TableBody,
} from "@/components/ui/table";
import { RadioRateType } from "@/services/radio/types";
import { useState } from "react";
import { RateTableHeader } from "./table/RateTableHeader";
import { RateTableRow } from "./table/RateTableRow";
import { EmptyRatesRow } from "./table/EmptyRatesRow";

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

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <RateTableHeader />
        <TableBody>
          {rates.length === 0 ? (
            <EmptyRatesRow />
          ) : (
            rates.map((rate) => (
              <RateTableRow
                key={rate.id}
                rate={rate}
                isEditing={editingId === rate.id}
                editedRate={editedRate}
                onEdit={handleEdit}
                onDelete={onDelete}
                onSave={handleSave}
                onCancel={handleCancel}
                onInputChange={handleInputChange}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
