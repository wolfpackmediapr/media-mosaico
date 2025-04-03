
import { useMemo } from "react";
import { 
  fetchRates, 
  createRate, 
  updateRate, 
  deleteRate 
} from "@/services/tv/rates";
import { fetchChannels } from "@/services/tv/channelService";
import { fetchPrograms } from "@/services/tv/programService";
import { TvRateType, ChannelType, ProgramType } from "@/services/tv/types";
import { useRatesManagement } from "@/hooks/common/useRatesManagement";

export function useTvRatesManagement() {
  const ratesManager = useRatesManagement<TvRateType, ChannelType, ProgramType>({
    fetchRates,
    createRate,
    updateRate,
    deleteRate,
    fetchMedia: fetchChannels,
    fetchPrograms,
    mediaType: 'tv',
    mediaIdField: 'channel_id',
    programIdField: 'program_id',
  });

  // Rename some fields to maintain API compatibility with existing components
  const {
    media: channels,
    selectedMedia: selectedChannel,
    setSelectedMedia: setSelectedChannel,
    ...rest
  } = ratesManager;

  // Return the hook data with TV-specific naming
  return {
    ...rest,
    channels,
    selectedChannel,
    setSelectedChannel,
    onMediaChange: setSelectedChannel,
  };
}
