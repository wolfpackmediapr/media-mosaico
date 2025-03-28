
import { Table, TableBody } from "@/components/ui/table";
import { RateTableHeader } from "./table/RateTableHeader";
import { RateTableRow } from "./table/RateTableRow";
import { EmptyRatesRow } from "./table/EmptyRatesRow";
import { TvRateType, ChannelType, ProgramType } from "@/services/tv/types";

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
  editingId,
}: TvRatesTableProps) {
  return (
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
              channels={channels}
              programs={programs}
              onEdit={onEdit}
              onDelete={onDelete}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              isEditing={editingId === rate.id}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
