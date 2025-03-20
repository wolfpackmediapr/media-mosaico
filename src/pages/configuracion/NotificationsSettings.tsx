
import React, { useState } from "react";
import { Bell, Plus, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the form schema
const formSchema = z.object({
  client_id: z.string().uuid(),
  notification_channels: z.array(z.string()).min(1, "Seleccione al menos un canal"),
  frequency: z.enum(["real_time", "hourly", "daily", "weekly"]),
  threshold: z.number().int().min(1),
  sources: z.array(z.string()),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

// Define the preference type
interface NotificationPreference {
  id: string;
  client_id: string;
  notification_channels: string[];
  frequency: string;
  threshold: number;
  sources: string[];
  is_active: boolean;
  clients?: {
    name: string;
  };
}

const NotificationsSettings = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notification preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as NotificationPreference[];
    },
  });

  // Fetch clients for the form
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Create notification preference
  const createPreference = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .insert(values)
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferencia creada",
        description: "La preferencia de notificación ha sido creada exitosamente.",
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la preferencia de notificación.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Toggle active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .update({ is_active: isActive })
        .eq("id", id)
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la preferencia de notificación.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Delete preference
  const deletePreference = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_preferences")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferencia eliminada",
        description: "La preferencia de notificación ha sido eliminada exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la preferencia de notificación.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notification_channels: ["in_app"],
      frequency: "daily",
      threshold: 1,
      sources: ["news", "social", "radio", "tv", "press"],
      is_active: true,
    },
  });

  // Handler for form submission
  const onSubmit = (values: FormValues) => {
    createPreference.mutate(values);
  };

  // Functions to get display values
  const getFrequencyDisplay = (frequency: string) => {
    const map: Record<string, string> = {
      "real_time": "Tiempo real",
      "hourly": "Cada hora",
      "daily": "Diario",
      "weekly": "Semanal",
    };
    return map[frequency] || frequency;
  };

  const getChannelsDisplay = (channels: string[]) => {
    const map: Record<string, string> = {
      "in_app": "App",
      "email": "Email",
      "sms": "SMS",
      "push": "Push",
    };
    return channels.map(c => map[c] || c).join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Preferencias de Notificaciones
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Configuración de las notificaciones y alertas
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Preferencia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear nueva preferencia de notificación</DialogTitle>
              <DialogDescription>
                Configure cómo quiere recibir las notificaciones para este cliente.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createPreference.isPending}>
                    {createPreference.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias de Notificación</CardTitle>
          <CardDescription>
            Gestione cómo se envían las notificaciones a los clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex space-x-4 items-center">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded animate-pulse w-1/4"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Canales</TableHead>
                    <TableHead>Frecuencia</TableHead>
                    <TableHead>Umbral</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preferences?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No hay preferencias de notificación configuradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    preferences?.map((pref) => (
                      <TableRow key={pref.id}>
                        <TableCell className="font-medium">
                          {pref.clients?.name || "Cliente desconocido"}
                        </TableCell>
                        <TableCell>
                          {getChannelsDisplay(pref.notification_channels)}
                        </TableCell>
                        <TableCell>
                          {getFrequencyDisplay(pref.frequency)}
                        </TableCell>
                        <TableCell>{pref.threshold}</TableCell>
                        <TableCell>
                          <Badge variant={pref.is_active ? "default" : "secondary"}>
                            {pref.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => 
                                toggleActive.mutate({ 
                                  id: pref.id, 
                                  isActive: !pref.is_active 
                                })
                              }
                            >
                              {pref.is_active ? "Desactivar" : "Activar"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm("¿Está seguro que desea eliminar esta preferencia?")) {
                                  deletePreference.mutate(pref.id);
                                }
                              }}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsSettings;
