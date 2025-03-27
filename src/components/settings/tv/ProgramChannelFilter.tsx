
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelType } from "@/services/tv/types";

interface ProgramChannelFilterProps {
  channels: ChannelType[];
  selectedChannelId: string;
  onChannelChange: (channelId: string) => void;
}

export function ProgramChannelFilter({ 
  channels, 
  selectedChannelId, 
  onChannelChange 
}: ProgramChannelFilterProps) {
  return (
    <div className="w-full md:max-w-xs mb-4">
      <Select 
        value={selectedChannelId} 
        onValueChange={onChannelChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Filtrar por canal" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">Todos los canales</SelectItem>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.name} ({channel.code})
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
