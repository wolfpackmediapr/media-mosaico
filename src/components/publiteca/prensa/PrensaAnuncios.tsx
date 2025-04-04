
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
  const [sources, setSources] = useState<Array<{id: string, name: string}>>([]);
  const [institutions, setInstitutions] = useState<Array<{id: string, name: string}>>([]);
  const [institutionCategories, setInstitutionCategories] = useState<Array<{id: string, name: string}>>([]);
  
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

  const onSubmit = (data: PrensaAnunciosFormValues) => {
    console.log("Form submitted:", data);
    // Here we would implement the actual submission logic
  };

  const handleClear = () => {
    form.reset();
  };

  // Fetch data from API
  React.useEffect(() => {
    // In a real implementation, these would be API calls
    // Simulated data for now
    setSources([
      { id: "1", name: "El Nuevo Día" },
      { id: "2", name: "Primera Hora" },
      { id: "3", name: "El Vocero" },
    ]);

    setInstitutionCategories([
      { id: "1", name: "Gobierno" },
      { id: "2", name: "Educación" },
      { id: "3", name: "Salud" },
    ]);

    setInstitutions([
      { id: "1", name: "Gobierno de Puerto Rico" },
      { id: "2", name: "Universidad de Puerto Rico" },
      { id: "3", name: "Departamento de Salud" },
    ]);
  }, []);

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
                    {sources.map(source => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
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
                    {institutionCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
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
                    {institutions.map(institution => (
                      <SelectItem key={institution.id} value={institution.id}>
                        {institution.name}
                      </SelectItem>
                    ))}
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
