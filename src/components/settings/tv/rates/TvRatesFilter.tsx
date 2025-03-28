
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChannelType, ProgramType } from "@/services/tv/types";
import { Search, X } from "lucide-react";

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
  programs,
}: TvRatesFilterProps) {
  // Filter programs by selected channel
  const filteredPrograms = selectedChannel === 'all'
    ? programs
    : programs.filter(program => program.channel_id === selectedChannel);

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por canal o programa..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedChannel}
            onValueChange={onChannelChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los canales</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedProgram}
            onValueChange={onProgramChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar programa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los programas</SelectItem>
              {filteredPrograms.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearFilters}
            title="Limpiar filtros"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
