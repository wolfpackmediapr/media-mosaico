
import { TvRatesHeader } from "./TvRatesHeader";
import { TvRatesFilter } from "./TvRatesFilter";
import { TvRatesTable } from "./TvRatesTable";
import { TvRatesEmptyState } from "./TvRatesEmptyState";
import { TvRateForm } from "./TvRateForm";
import { TvRateType, ChannelType, ProgramType } from "@/services/tv/types";

interface TvRatesContentProps {
  isLoading: boolean;
  searchTerm: string;
  selectedChannel: string;
  selectedProgram: string;
  onSearchChange: (term: string) => void;
  onChannelChange: (channelId: string) => void;
  onProgramChange: (programId: string) => void;
  onShowAll: () => void;
  isAddingNew: boolean;
  onAddRate: (rateData: Omit<TvRateType, 'id' | 'created_at' | 'channel_name' | 'program_name'>) => void;
  onCancelAdd: () => void;
  filteredRates: TvRateType[];
  totalRates: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rateData: Omit<TvRateType, 'created_at' | 'channel_name' | 'program_name'>) => void;
  onCancelEdit: () => void;
  editingId: string | null;
  channels: ChannelType[];
  programs: ProgramType[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onImportClick: () => void;
}

export function TvRatesContent({
  isLoading,
  searchTerm,
  selectedChannel,
  selectedProgram,
  onSearchChange,
  onChannelChange,
  onProgramChange,
  onShowAll,
  isAddingNew,
  onAddRate,
  onCancelAdd,
  filteredRates,
  totalRates,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editingId,
  channels,
  programs,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onImportClick,
}: TvRatesContentProps) {
  // Render empty state if there are no rates and we're not adding a new one
  if (totalRates === 0 && !isAddingNew) {
    return <TvRatesEmptyState onAddClick={() => onEdit("")} />;
  }

  return (
    <div className="space-y-4">
      <TvRatesHeader onAddClick={() => onEdit("")} onImportClick={onImportClick} />
      
      <TvRatesFilter
        searchTerm={searchTerm}
        selectedChannel={selectedChannel}
        selectedProgram={selectedProgram}
        onSearchChange={onSearchChange}
        onChannelChange={onChannelChange}
        onProgramChange={onProgramChange}
        onClearFilters={onShowAll}
        channels={channels}
        programs={programs}
      />
      
      {isAddingNew && (
        <TvRateForm
          channels={channels}
          programs={programs}
          onSave={onAddRate}
          onCancel={onCancelAdd}
        />
      )}
      
      <TvRatesTable
        rates={filteredRates}
        channels={channels}
        programs={programs}
        onEdit={onEdit}
        onDelete={onDelete}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        editingId={editingId}
      />
    </div>
  );
}
