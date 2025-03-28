
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Filter } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StationType, ProgramType } from "@/services/radio/types";

interface RadioRatesFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedStation: string;
  setSelectedStation: (stationId: string) => void;
  selectedProgram: string;
  setSelectedProgram: (programId: string) => void;
  stations: StationType[];
  programs: ProgramType[];
  handleShowAll: () => void;
}

export function RadioRatesFilter({ 
  searchTerm, 
  setSearchTerm, 
  selectedStation,
  setSelectedStation,
  selectedProgram,
  setSelectedProgram,
  stations,
  programs,
  handleShowAll 
}: RadioRatesFilterProps) {
  // Filter programs by selected station
  const filteredPrograms = selectedStation === 'all' 
    ? programs 
    : programs.filter(program => program.station_id === selectedStation);

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-64 space-y-1.5">
          <Label htmlFor="search-rate">BÚSQUEDA RÁPIDA</Label>
          <div className="relative">
            <Input
              id="search-rate"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tarifa..."
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="w-full sm:w-64 space-y-1.5">
          <Label htmlFor="select-station">MEDIO</Label>
          <Select value={selectedStation} onValueChange={setSelectedStation}>
            <SelectTrigger id="select-station">
              <SelectValue placeholder="Seleccionar medio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los medios</SelectItem>
              {stations.map((station) => (
                <SelectItem key={station.id} value={station.id}>{station.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-64 space-y-1.5">
          <Label htmlFor="select-program">PROGRAMA</Label>
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger id="select-program">
              <SelectValue placeholder="Seleccionar programa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los programas</SelectItem>
              {filteredPrograms.map((program) => (
                <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button onClick={() => setSearchTerm(searchTerm)} size="sm" variant="secondary">
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          <Button onClick={handleShowAll} size="sm" variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Mostrar todo
          </Button>
        </div>
      </div>
    </div>
  );
}
