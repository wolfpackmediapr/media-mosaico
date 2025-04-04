
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { usePressData } from "@/hooks/use-press-data";

const COLOR_OPTIONS = ["Blanco y negro", "Un color", "Dos Colores", "Full color"];

interface PrensaAnunciosFormValues {
  medio: string;
  fechaEntre?: Date;
  fechaY?: Date;
  temaCampania: string;
  categoriaInstitucion: string;
  institucion: string;
  seccion: string;
  pagina: string;
  color: string;
}

export function PrensaAnuncios() {
  const { 
    sources, 
    institutions, 
    institutionCategories, 
    loadingSources, 
    loadingInstitutions, 
    loadingCategories 
  } = usePressData();
  
  const [filteredInstitutions, setFilteredInstitutions] = useState<Array<{id: string, name: string}>>([]);
  
  // Form initialization
  const form = useForm<PrensaAnunciosFormValues>({
    defaultValues: {
      medio: "",
      temaCampania: "",
      categoriaInstitucion: "",
      institucion: "",
      seccion: "",
      pagina: "",
      color: ""
    }
  });

  // Watch for category changes
  const selectedCategory = form.watch("categoriaInstitucion");

  // Filter institutions when category changes
  React.useEffect(() => {
    if (selectedCategory) {
      // In a real implementation, this would filter based on actual relationships
      // For now, we'll just simulate filtering
      setFilteredInstitutions(
        institutions.filter((_, index) => index % 2 === (selectedCategory === "1" ? 0 : 1))
      );
    } else {
      setFilteredInstitutions(institutions);
    }
  }, [selectedCategory, institutions]);

  const onSubmit = (data: PrensaAnunciosFormValues) => {
    console.log("Form submitted:", data);
    // Here we would implement the actual submission logic
  };

  const handleClear = () => {
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Medio */}
          <FormField
            control={form.control}
            name="medio"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">MEDIO</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Por favor seleccione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingSources ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                      sources.map(source => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Fecha */}
          <div className="space-y-2">
            <FormLabel className="font-medium">FECHA</FormLabel>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">ENTRE</span>
                <DatePicker
                  date={form.watch("fechaEntre")}
                  onDateChange={(date) => form.setValue("fechaEntre", date)}
                  placeholder=""
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Y</span>
                <DatePicker
                  date={form.watch("fechaY")}
                  onDateChange={(date) => form.setValue("fechaY", date)}
                  placeholder=""
                />
              </div>
            </div>
          </div>

          {/* Tema de Campaña */}
          <FormField
            control={form.control}
            name="temaCampania"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">TEMA DE CAMPAÑA</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Categoría de Institución */}
          <FormField
            control={form.control}
            name="categoriaInstitucion"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">CATEGORÍA DE INSTITUCIÓN</FormLabel>
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

          {/* Institución */}
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

          {/* Sección */}
          <FormField
            control={form.control}
            name="seccion"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">SECCIÓN</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Página */}
          <FormField
            control={form.control}
            name="pagina"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">PÁGINA</FormLabel>
                <FormControl>
                  <Input {...field} type="number" />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Color */}
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">COLOR</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Por favor seleccione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COLOR_OPTIONS.map(color => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
