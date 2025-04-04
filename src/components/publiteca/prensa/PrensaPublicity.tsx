
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Check, CheckCheck, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MedioOption {
  id: string;
  name: string;
  checked: boolean;
}

interface CategoriaOption {
  id: string;
  name: string;
}

interface InstitucionOption {
  id: string;
  name: string;
  categoryId: string;
}

export function PrensaPublicity() {
  const [mediosOptions, setMediosOptions] = useState<MedioOption[]>([]);
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [instituciones, setInstituciones] = useState<InstitucionOption[]>([]);
  const [filteredInstituciones, setFilteredInstituciones] = useState<InstitucionOption[]>([]);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>("");
  const [selectedInstitucionId, setSelectedInstitucionId] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(new Date());
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(new Date());
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");

  // Load initial data
  useEffect(() => {
    // In a real implementation, these would be API calls
    const mockMedios: MedioOption[] = [
      { id: "1", name: "EL NUEVO DIA", checked: false },
      { id: "2", name: "EL VOCERO", checked: false },
      { id: "3", name: "PRIMERA HORA", checked: false },
      { id: "4", name: "THE SAN JUAN STAR INGLES", checked: false },
      { id: "5", name: "CARIBBEAN BUSINESS", checked: false },
      { id: "6", name: "EL ORIENTAL", checked: false },
      { id: "7", name: "LA SEMANA", checked: false },
      { id: "8", name: "LA PERLA DEL SUR", checked: false },
      { id: "9", name: "EL REGIONAL DE GUAYAMA", checked: false },
      { id: "10", name: "PUERTO RICO DAILY SUN", checked: false },
      { id: "11", name: "CLARIDAD", checked: false },
      { id: "12", name: "METRO", checked: false },
      // Add more media outlets as needed
    ];
    setMediosOptions(mockMedios);

    const mockCategorias: CategoriaOption[] = [
      { id: "1", name: "ABOGADOS" },
      { id: "2", name: "AGENCIAS GUBERNAMENTALES" },
      { id: "3", name: "AGRICULTURA" },
      { id: "4", name: "ALCALDIAS" },
      { id: "5", name: "AMBIENTE" },
      { id: "6", name: "ASOCIACIONES" },
      { id: "7", name: "BANCOS" },
      { id: "8", name: "EDUCACION" },
      { id: "9", name: "GOBIERNO" },
      { id: "10", name: "SALUD" },
      // Add more categories as needed
    ];
    setCategorias(mockCategorias);

    const mockInstituciones: InstitucionOption[] = [
      { id: "1", name: "Departamento de Salud", categoryId: "10" },
      { id: "2", name: "Hospital Universitario", categoryId: "10" },
      { id: "3", name: "Universidad de Puerto Rico", categoryId: "8" },
      { id: "4", name: "Departamento de Educación", categoryId: "8" },
      { id: "5", name: "Fortaleza", categoryId: "9" },
      { id: "6", name: "Municipio de San Juan", categoryId: "4" },
      { id: "7", name: "Departamento de Recursos Naturales", categoryId: "5" },
      { id: "8", name: "Bufete Legal Rodríguez", categoryId: "1" },
      { id: "9", name: "Banco Popular", categoryId: "7" },
      { id: "10", name: "Asociación de Maestros", categoryId: "6" },
      // Add more institutions as needed
    ];
    setInstituciones(mockInstituciones);
    setFilteredInstituciones(mockInstituciones);
  }, []);

  // Filter institutions when category changes
  useEffect(() => {
    if (selectedCategoriaId) {
      setFilteredInstituciones(
        instituciones.filter(inst => inst.categoryId === selectedCategoriaId)
      );
    } else {
      setFilteredInstituciones(instituciones);
    }
  }, [selectedCategoriaId, instituciones]);

  // Handle search filter
  useEffect(() => {
    if (searchText) {
      const filtered = mediosOptions.filter(medio => 
        medio.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setMediosOptions(prevState => 
        prevState.map(medio => ({
          ...medio,
          visible: filtered.some(f => f.id === medio.id)
        }))
      );
    }
  }, [searchText]);

  const handleSelectAll = () => {
    setMediosOptions(mediosOptions.map(medio => ({
      ...medio,
      checked: true
    })));
  };

  const handleDeselectAll = () => {
    setMediosOptions(mediosOptions.map(medio => ({
      ...medio,
      checked: false
    })));
  };

  const handleMedioChange = (id: string, checked: boolean) => {
    setMediosOptions(mediosOptions.map(medio => 
      medio.id === id ? { ...medio, checked } : medio
    ));
  };

  const handleSearch = () => {
    console.log("Search with params:", {
      medios: mediosOptions.filter(m => m.checked).map(m => m.id),
      fechaDesde,
      fechaHasta,
      institucion: selectedInstitucionId,
      showAnalysis
    });
    // Here we would implement actual search logic
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Media selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>MEDIO</span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSelectAll}
                    className="text-xs h-8"
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Seleccionar Todos
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDeselectAll}
                    className="text-xs h-8"
                  >
                    Deseleccionar Todos
                  </Button>
                </div>
              </CardTitle>
              <div className="mt-2">
                <Input
                  placeholder="Buscar medio..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {mediosOptions.map((medio) => (
                    <div key={medio.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`medio-${medio.id}`} 
                        checked={medio.checked}
                        onCheckedChange={(checked) => 
                          handleMedioChange(medio.id, checked === true)
                        }
                      />
                      <Label
                        htmlFor={`medio-${medio.id}`}
                        className="text-sm"
                      >
                        {medio.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Search controls */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Criterios de búsqueda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fecha */}
              <div className="space-y-2">
                <Label className="font-medium">FECHA</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium w-16">DESDE</span>
                    <DatePicker
                      date={fechaDesde}
                      onDateChange={setFechaDesde}
                      placeholder=""
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium w-16">HASTA</span>
                    <DatePicker
                      date={fechaHasta}
                      onDateChange={setFechaHasta}
                      placeholder=""
                    />
                  </div>
                </div>
              </div>

              {/* Institución */}
              <div className="space-y-2">
                <Label className="font-medium">INSTITUCIÓN</Label>
                <Select 
                  value={selectedInstitucionId} 
                  onValueChange={setSelectedInstitucionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Por favor seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredInstituciones.map(institucion => (
                      <SelectItem key={institucion.id} value={institucion.id}>
                        {institucion.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Análisis */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="analysis" 
                  checked={showAnalysis}
                  onCheckedChange={(checked) => setShowAnalysis(checked === true)}
                />
                <Label htmlFor="analysis" className="font-medium">MOSTRAR DATOS Y GRÁFICAS</Label>
              </div>

              <Button className="w-full mt-4" onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom section - Categories and Institutions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Filtros adicionales</CardTitle>
          <CardDescription>Seleccione categorías e instituciones para filtrar los resultados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Categories Column */}
            <div>
              <h3 className="font-medium mb-2">CATEGORÍAS</h3>
              <ScrollArea className="h-[300px]">
                <Accordion type="multiple" className="w-full">
                  {categorias.map((categoria) => (
                    <AccordionItem key={categoria.id} value={categoria.id}>
                      <AccordionTrigger className="py-2">
                        <div className="flex items-center">
                          <Checkbox 
                            id={`cat-${categoria.id}`}
                            checked={selectedCategoriaId === categoria.id}
                            onCheckedChange={(checked) => 
                              setSelectedCategoriaId(checked ? categoria.id : "")
                            }
                            className="mr-2"
                          />
                          <span>{categoria.name}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-6 space-y-2">
                          {instituciones
                            .filter(inst => inst.categoryId === categoria.id)
                            .map(institucion => (
                              <div key={institucion.id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`inst-${institucion.id}`} 
                                  checked={selectedInstitucionId === institucion.id}
                                  onCheckedChange={(checked) => 
                                    setSelectedInstitucionId(checked ? institucion.id : "")
                                  }
                                />
                                <Label
                                  htmlFor={`inst-${institucion.id}`}
                                  className="text-sm"
                                >
                                  {institucion.name}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </div>

            {/* Institutions Column */}
            <div>
              <h3 className="font-medium mb-2">INSTITUCIONES (SELECT ALL)</h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {filteredInstituciones.map((institucion) => (
                    <div key={institucion.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`inst-list-${institucion.id}`} 
                        checked={selectedInstitucionId === institucion.id}
                        onCheckedChange={(checked) => 
                          setSelectedInstitucionId(checked ? institucion.id : "")
                        }
                      />
                      <Label
                        htmlFor={`inst-list-${institucion.id}`}
                        className="text-sm"
                      >
                        {institucion.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
