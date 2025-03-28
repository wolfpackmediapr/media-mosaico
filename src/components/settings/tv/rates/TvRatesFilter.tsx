
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { ChannelType, ProgramType } from "@/services/tv/types";

interface TvRatesFilterProps {
  searchTerm: string;
  selectedChannel: string;
  selectedProgram: string;
  onSearchChange: (term: string) => void;
  onChannelChange: (channelId: string) => void;
  onProgramChange: (programId: string) => void;
  onClearFilters: () => void;
  channels: ChannelType[];
  programs: ProgramType[];
}

export function TvRatesFilter({
  searchTerm,
  selectedChannel,
  selectedProgram,
  onSearchChange,
  onChannelChange,
  onProgramChange,
  onClearFilters,
  channels,
  programs
}: TvRatesFilterProps) {
  // Filter programs based on selected channel
  const filteredPrograms = selectedChannel === 'all'
    ? programs
    : programs.filter(program => program.channel_id === selectedChannel);

  const hasFilters = searchTerm || selectedChannel !== 'all' || selectedProgram !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por canal o programa"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select
          value={selectedChannel}
          onValueChange={onChannelChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todos los canales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los canales</SelectItem>
            {channels.map(channel => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedProgram}
          onValueChange={onProgramChange}
          disabled={filteredPrograms.length === 0}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todos los programas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los programas</SelectItem>
            {filteredPrograms.map(program => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {hasFilters && (
          <Button 
            variant="outline" 
            onClick={onClearFilters}
            className="whitespace-nowrap"
          >
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
