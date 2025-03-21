
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgramType, ChannelType } from "@/services/tv/channelService";

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  channel_id: z.string().min(1, "El canal es requerido"),
  start_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)"),
  end_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)"),
  days: z.array(z.string()).min(1, "Selecciona al menos un día"),
});

type FormValues = z.infer<typeof formSchema>;

interface ProgramFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  title: string;
  program?: ProgramType;
  channels: ChannelType[];
}

const weekdays = [
  { id: "Mon", label: "Lunes" },
  { id: "Tue", label: "Martes" },
  { id: "Wed", label: "Miércoles" },
  { id: "Thu", label: "Jueves" },
  { id: "Fri", label: "Viernes" },
  { id: "Sat", label: "Sábado" },
  { id: "Sun", label: "Domingo" },
];

export function ProgramFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  program,
  channels,
}: ProgramFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: program?.id || undefined,
      name: program?.name || "",
      channel_id: program?.channel_id || "",
      start_time: program?.start_time || "",
      end_time: program?.end_time || "",
      days: program?.days || [],
    },
  });

  // Reset form when program prop changes
  useEffect(() => {
    if (open) {
      form.reset({
        id: program?.id || undefined,
        name: program?.name || "",
        channel_id: program?.channel_id || "",
        start_time: program?.start_time || "",
        end_time: program?.end_time || "",
        days: program?.days || [],
      });
    }
  }, [program, form, open]);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit(values);
    form.reset();
  };

  // Helper function to set all weekdays or weekend
  const setDays = (days: string[]) => {
    form.setValue("days", days);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Completa los campos para {program ? "actualizar el" : "crear un nuevo"} programa de televisión.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: Noticias 11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="channel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canal</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un canal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name} ({channel.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Inicio</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="HH:MM" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Fin</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="HH:MM" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="days"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Días</FormLabel>
                    <div className="flex space-x-2 mt-1">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDays(["Mon", "Tue", "Wed", "Thu", "Fri"])}
                      >
                        Lun-Vie
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDays(["Sat", "Sun"])}
                      >
                        Fin de semana
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])}
                      >
                        Todos
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {weekdays.map((day) => (
                      <FormField
                        key={day.id}
                        control={form.control}
                        name="days"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={day.id}
                              className="flex flex-row items-start space-x-2 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(day.id)}
                                  onCheckedChange={(checked) => {
                                    const currentDays = field.value || [];
                                    const updatedDays = checked
                                      ? [...currentDays, day.id]
                                      : currentDays.filter((d) => d !== day.id);
                                    field.onChange(updatedDays);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {day.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
