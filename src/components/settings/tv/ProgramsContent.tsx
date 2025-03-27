
import { ProgramsTable } from "./ProgramsTable";
import { ProgramLoadingState, ProgramEmptyState } from "./ProgramStates";
import { ProgramsPagination } from "./ProgramsPagination";
import { ProgramChannelFilter } from "./ProgramChannelFilter";
import { ChannelType, ProgramType } from "@/services/tv/types";

interface ProgramsContentProps {
  isLoading: boolean;
  programs: ProgramType[];
  channels: ChannelType[];
  selectedChannelId: string;
  currentPage: number;
  totalPages: number;
  filteredPrograms: ProgramType[];
  onChannelChange: (channelId: string) => void;
  onEdit: (program: ProgramType) => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
  getCurrentPagePrograms: () => ProgramType[];
}

export function ProgramsContent({
  isLoading,
  programs,
  channels,
  selectedChannelId,
  currentPage,
  totalPages,
  filteredPrograms,
  onChannelChange,
  onEdit,
  onDelete,
  onPageChange,
  getCurrentPagePrograms
}: ProgramsContentProps) {
  if (isLoading) {
    return <ProgramLoadingState />;
  }

  if (programs.length === 0) {
    return <ProgramEmptyState hasChannels={channels.length > 0} />;
  }

  return (
    <>
      <ProgramChannelFilter 
        channels={channels}
        selectedChannelId={selectedChannelId}
        onChannelChange={onChannelChange}
      />
      
      <div className="mt-4">
        <ProgramsTable 
          programs={getCurrentPagePrograms()} 
          channels={channels}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
      
      {filteredPrograms.length > 10 && (
        <div className="mt-4">
          <ProgramsPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </>
  );
}
