
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { usePressData } from "@/hooks/use-press-data";

interface PrensaPublicityFormValues {
  selectedMedia: string[];
  fechaDesde?: Date;
  fechaHasta?: Date;
  institucion: string;
  showAnalysis: boolean;
  selectedCategory: string;
}

export function PrensaPublicity() {
  const { sources, institutions, institutionCategories, loadingSources, loadingInstitutions, loadingCategories } = usePressData();
  
  // State for selected sources (media outlets)
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Array<{id: string, name: string}>>([]);
  
  // Form initialization
  const form = useForm<PrensaPublicityFormValues>({
    defaultValues: {
      selectedMedia: [],
      institucion: "",
      showAnalysis: false,
      selectedCategory: ""
    }
  });

  // Watch for category changes to filter institutions
  const selectedCategory = form.watch("selectedCategory");

  useEffect(() => {
    if (selectedCategory) {
      // In a real app, you would filter based on actual category relationships
      // Here we're just simulating filtering
      setFilteredInstitutions(institutions.filter((_, index) => index % 2 === 0));
    } else {
      setFilteredInstitutions(institutions);
    }
  }, [selectedCategory, institutions]);

  const onSubmit = (data: PrensaPublicityFormValues) => {
    // Add the selectedMedia to the form data
    data.selectedMedia = selectedMedia;
    console.log("Form submitted:", data);
    // Here we would implement the actual submission logic
  };

  const handleClear = () => {
    form.reset();
    setSelectedMedia([]);
  };

  const handleMediaToggle = (mediaId: string) => {
    setSelectedMedia(prev => {
      if (prev.includes(mediaId)) {
        return prev.filter(id => id !== mediaId);
      } else {
        return [...prev, mediaId];
      }
    });
  };

  const handleSelectAll = () => {
    const allMediaIds = sources.map(source => source.id);
    setSelectedMedia(allMediaIds);
  };

  const handleDeselectAll = () => {
    setSelectedMedia([]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Media Selection */}
          <div>
            <div className="flex justify-between mb-2">
              <FormLabel className="font-medium">MEDIO</FormLabel>
              <div className="space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAll}
                  disabled={loadingSources}
                >
                  Seleccionar Todos
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDeselectAll}
                  disabled={loadingSources}
                >
                  Deseleccionar Todos
                </Button>
              </div>
            </div>
            <ScrollArea className="h-40 border rounded-md p-2">
              {loadingSources ? (
                <div className="p-4 text-center text-muted-foreground">Cargando medios...</div>
              ) : sources.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No hay medios disponibles</div>
              ) : (
                <div className="space-y-2">
                  {sources.map(source => (
                    <div key={source.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`media-${source.id}`} 
                        checked={selectedMedia.includes(source.id)} 
                        onCheckedChange={() => handleMediaToggle(source.id)}
                      />
                      <label 
                        htmlFor={`media-${source.id}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {source.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <FormLabel className="font-medium">FECHA</FormLabel>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">DESDE</span>
                <DatePicker
                  date={form.watch("fechaDesde")}
                  onDateChange={(date) => form.setValue("fechaDesde", date)}
                  placeholder=""
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">HASTA</span>
                <DatePicker
                  date={form.watch("fechaHasta")}
                  onDateChange={(date) => form.setValue("fechaHasta", date)}
                  placeholder=""
                />
              </div>
            </div>
          </div>

          {/* Categories and Institution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Filter */}
            <FormField
              control={form.control}
              name="selectedCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">CATEGORÍAS</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Por favor seleccione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingCategories ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                      ) : (
                        institutionCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Institution */}
            <FormField
              control={form.control}
              name="institucion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">INSTITUCIÓN</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Por favor seleccione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingInstitutions ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                      ) : (
                        filteredInstitutions.map(institution => (
                          <SelectItem key={institution.id} value={institution.id}>
                            {institution.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          
          {/* Analysis Checkbox */}
          <FormField
            control={form.control}
            name="showAnalysis"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">
                  MOSTRAR DATOS Y GRÁFICAS
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" className="gap-2">
            <Search className="h-4 w-4" />
            Buscar
          </Button>
          <Button type="button" variant="outline" onClick={handleClear}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
