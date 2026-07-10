
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { UserProfile, fetchUserPermissions } from "@/services/users/userService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ALL_SECTIONS, type SectionKey } from "@/hooks/use-section-permissions";
import { toast } from "sonner";

interface UserFormProps {
  onSubmit: (user: any & { permissions?: string[] }) => Promise<void>;
  onCancel: () => void;
  editingUser: UserProfile | null;
  roles: string[];
}

const userSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres."),
  role: z.enum(["administrator", "data_entry"], {
    errorMap: () => ({ message: "Rol no válido" }),
  }),
  email: z.string().email("Correo electrónico inválido").optional().or(z.literal("")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").optional().or(z.literal("")),
});

export function UserForm({ onSubmit, onCancel, editingUser, roles }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Set<SectionKey>>(
    new Set(ALL_SECTIONS.map((s) => s.key))
  );
  
  const defaultValues = {
    username: editingUser?.username || "",
    role: editingUser?.role || "data_entry" as const,
    email: editingUser?.email || "",
    password: "",
  };

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  const currentRole = form.watch("role");

  useEffect(() => {
    if (editingUser) {
      form.reset({
        username: editingUser.username,
        role: editingUser.role,
        email: editingUser.email || "",
        password: "", // Don't populate password when editing
      });
      // Load current permissions
      fetchUserPermissions(editingUser.id).then((secs) => {
        setPermissions(new Set(secs as SectionKey[]));
      });
    } else {
      form.reset(defaultValues);
      setPermissions(new Set(ALL_SECTIONS.map((s) => s.key)));
    }
  }, [editingUser, form]);

  const togglePermission = (key: SectionKey, checked: boolean) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleSubmit = async (values: z.infer<typeof userSchema>) => {
    setLoading(true);
    try {
      const permsArray = Array.from(permissions);
      if (editingUser) {
        const { email, ...updateData } = values;
        await onSubmit({
          id: editingUser.id,
          ...updateData,
          password: values.password || undefined, // only include if non-empty
          permissions: permsArray,
        });
      } else {
        // Creating new user requires email and password
        if (!values.email || !values.password) {
          toast.error("El correo y la contraseña son requeridos para crear un usuario.");
          setLoading(false);
          return;
        }
        await onSubmit({ ...values, permissions: permsArray });
      }
      
      form.reset(defaultValues);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingUser ? "Editar Usuario" : "Crear Usuario"}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de usuario</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de usuario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!editingUser && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="correo@ejemplo.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {editingUser ? "Nueva contraseña (dejar en blanco para no cambiar)" : "Contraseña"}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="******" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role} value={role}>
                          {role === "administrator" ? "Administrador" : "Entrada de datos"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-md border p-4">
              <div>
                <h4 className="text-sm font-semibold">Permisos de acceso a secciones</h4>
                {currentRole === "administrator" ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Los administradores tienen acceso completo a todas las secciones.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecciona las secciones que este usuario podrá ver y acceder. Inicio y Ayuda están siempre disponibles.
                  </p>
                )}
              </div>
              {currentRole !== "administrator" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_SECTIONS.filter((s) => s.key !== "inicio").map((s) => {
                    const id = `perm-${s.key}`;
                    const checked = permissions.has(s.key);
                    return (
                      <div key={s.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={(c) => togglePermission(s.key, !!c)}
                        />
                        <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                          {s.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel} type="button">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Procesando..." : (editingUser ? "Actualizar" : "Crear")}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
