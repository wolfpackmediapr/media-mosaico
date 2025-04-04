
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const NEWS_CATEGORIES = [
  "Accidentes", "Agencias de Gobierno", "Ambiente", "Ambiente & El Tiempo", 
  "Ciencia & Tecnología", "Comunidad", "Crimen", "Deportes", "Economía & Negocios", 
  "Educación & Cultura", "EE.UU. & Internacionales", "Entretenimiento", "Gobierno", 
  "Otras", "Política", "Religión", "Salud", "Tribunales"
];

const GENRE_OPTIONS = [
  "Artículo", "Columna", "Comentario", "Crítica", "Editorial", "Encuesta", 
  "Entrevista", "Nota Comentada", "Nota Informativa", "Reportaje", "Reseña", "Salud"
];

const HEADLINE_OPTIONS = ["Llamativo", "Informativo"];

interface PrensaNoticiasFormValues {
  medio: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  titulo: string;
  institucion: string;
  participante: string;
  categoria: string;
  resumen: string;
  seccion: string;
  fuente: string;
  genero: string;
  titular: string;
}

export function PrensaNoticias() {
  const [sources, setSources] = useState<Array<{id: string, name: string}>>([]);
  const [institutions, setInstitutions] = useState<Array<{id: string, name: string}>>([]);
  const [participants, setParticipants] = useState<Array<{id: string, name: string}>>([]);
  
  // Form initialization
  const form = useForm<PrensaNoticiasFormValues>({
    defaultValues: {
      medio: "",
      titulo: "",
      institucion: "",
      participante: "",
      categoria: "",
      resumen: "",
      seccion: "",
      fuente: "",
      genero: "",
      titular: ""
    }
  });

  const onSubmit = (data: PrensaNoticiasFormValues) => {
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

    setInstitutions([
      { id: "1", name: "Gobierno de Puerto Rico" },
      { id: "2", name: "Universidad de Puerto Rico" },
      { id: "3", name: "Departamento de Salud" },
    ]);

    setParticipants([
      { id: "1", name: "Juan Pérez" },
      { id: "2", name: "María Rodríguez" },
      { id: "3", name: "Carlos Sánchez" },
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

          {/* Título */}
          <FormField
            control={form.control}
            name="titulo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">TÍTULO</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
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

          {/* Participante */}
          <FormField
            control={form.control}
            name="participante"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">PARTICIPANTE</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Por favor seleccione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {participants.map(participant => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Categoría */}
          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">CATEGORÍA</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Por favor seleccione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {NEWS_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Resumen */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="resumen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">RESUMEN</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[100px]" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

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

          {/* Fuente */}
          <FormField
            control={form.control}
            name="fuente"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">FUENTE</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Género */}
          <FormField
            control={form.control}
            name="genero"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">GÉNERO</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Por favor seleccione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENRE_OPTIONS.map(genre => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {/* Titular */}
          <FormField
            control={form.control}
            name="titular"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">TITULAR</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Por favor seleccione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HEADLINE_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
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
