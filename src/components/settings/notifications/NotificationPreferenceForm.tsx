
import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

// Define the form schema
const formSchema = z.object({
  client_id: z.string().uuid(),
  notification_channels: z.array(z.string()).min(1, "Seleccione al menos un canal"),
  frequency: z.enum(["real_time", "hourly", "daily", "weekly"]),
  threshold: z.number().int().min(1),
  sources: z.array(z.string()),
  is_active: z.boolean().default(true),
});

export type NotificationPreferenceFormValues = z.infer<typeof formSchema>;

interface NotificationPreferenceFormProps {
  onSubmit: (values: NotificationPreferenceFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  clients?: { id: string; name: string }[];
}

const NotificationPreferenceForm = ({
  onSubmit,
  onCancel,
  isSubmitting,
  clients = [],
}: NotificationPreferenceFormProps) => {
  // Form setup
  const form = useForm<NotificationPreferenceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notification_channels: ["in_app"],
      frequency: "daily",
      threshold: 1,
      sources: ["news", "social", "radio", "tv", "press"],
      is_active: true,
    },
  });

  const handleSubmit = (values: NotificationPreferenceFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notification_channels"
          render={() => (
            <FormItem>
              <div className="mb-2">
                <FormLabel>Canales de notificación</FormLabel>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "in_app", label: "En App" },
                  { id: "email", label: "Correo" },
                  { id: "sms", label: "SMS" },
                  { id: "push", label: "Push" },
                ].map((channel) => (
                  <FormField
                    key={channel.id}
                    control={form.control}
                    name="notification_channels"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={channel.id}
                          className="flex flex-row items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(channel.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, channel.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== channel.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {channel.label}
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
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frecuencia</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione frecuencia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="real_time">Tiempo real</SelectItem>
                  <SelectItem value="hourly">Cada hora</SelectItem>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Umbral mínimo (menciones)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Mínimo de menciones para disparar una notificación
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sources"
          render={() => (
            <FormItem>
              <div className="mb-2">
                <FormLabel>Fuentes a monitorear</FormLabel>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "news", label: "Noticias" },
                  { id: "social", label: "Redes Sociales" },
                  { id: "radio", label: "Radio" },
                  { id: "tv", label: "TV" },
                  { id: "press", label: "Prensa" },
                ].map((source) => (
                  <FormField
                    key={source.id}
                    control={form.control}
                    name="sources"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={source.id}
                          className="flex flex-row items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(source.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, source.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== source.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {source.label}
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
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Activo</FormLabel>
                <FormDescription>
                  Habilitar o deshabilitar estas notificaciones
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default NotificationPreferenceForm;
