
import { RatesContent } from "@/components/settings/common/rates/RatesContent";
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
  onAddRate: (rateData: Omit<TvRateType, 'id' | 'created_at' | 'channel_name' | 'program_name'>) => Promise<void>;
  onCancelAdd: () => void;
  filteredRates: TvRateType[];
  totalRates: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (rateData: Omit<TvRateType, 'created_at' | 'channel_name' | 'program_name'>) => Promise<void>;
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

export function TvRatesContent(props: TvRatesContentProps) {
  // Adapter function to make the filter component work with our generic component
  const FilterAdapter = ({ 
    searchTerm, 
    selectedMedia, 
    selectedProgram, 
    onSearchChange, 
    onMediaChange, 
    onProgramChange, 
    onClearFilters, 
    media, 
    programs 
  }: any) => (
    <TvRatesFilter
      searchTerm={searchTerm}
      selectedChannel={selectedMedia}
      selectedProgram={selectedProgram}
      onSearchChange={onSearchChange}
      onChannelChange={onMediaChange}
      onProgramChange={onProgramChange}
      onClearFilters={onClearFilters}
      channels={media}
      programs={programs}
    />
  );

  // Adapter function to make the table component work with our generic component
  const TableAdapter = ({ rates, ...rest }: any) => (
    <TvRatesTable
      rates={rates}
      channels={props.channels}
      programs={props.programs}
      {...rest}
    />
  );

  return (
    <RatesContent<TvRateType, ChannelType, ProgramType>
      {...props}
      selectedMedia={props.selectedChannel}
      onMediaChange={props.onChannelChange}
      media={props.channels}
      HeaderComponent={TvRatesHeader}
      FilterComponent={FilterAdapter}
      RateFormComponent={TvRateForm}
      TableComponent={TableAdapter}
      EmptyStateComponent={TvRatesEmptyState}
    />
  );
}
