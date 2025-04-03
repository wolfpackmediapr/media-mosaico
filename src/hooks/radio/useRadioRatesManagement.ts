
import { 
  fetchRates,
  createRate,
  updateRate,
  deleteRate,
} from "@/services/radio/rates";
import { fetchStations } from "@/services/radio/stationService";
import { fetchPrograms } from "@/services/radio/programService";
import { RadioRateType, StationType, ProgramType } from "@/services/radio/types";
import { useRatesManagement } from "@/hooks/common/useRatesManagement";

export function useRadioRatesManagement() {
  const ratesManager = useRatesManagement<RadioRateType, StationType, ProgramType>({
    fetchRates,
    createRate,
    updateRate,
    deleteRate,
    fetchMedia: fetchStations,
    fetchPrograms,
    mediaType: 'radio',
    mediaIdField: 'station_id',
    programIdField: 'program_id',
  });

  // Rename some fields to maintain API compatibility with existing components
  const {
    media: stations,
    selectedMedia: selectedStation,
    setSelectedMedia: setSelectedStation,
    ...rest
  } = ratesManager;

  // Return the hook data with Radio-specific naming
  return {
    ...rest,
    stations,
    selectedStation,
    setSelectedStation,
    onMediaChange: setSelectedStation,
  };
}
