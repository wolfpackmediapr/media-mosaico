
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { UserProfile } from "@/services/users/userService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface UserFormProps {
  onSubmit: (user: any) => Promise<void>;
  onCancel: () => void;
  editingUser: UserProfile | null;
  roles: string[];
}

const userSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres."),
  role: z.enum(["administrator", "data_entry"], {
    errorMap: () => ({ message: "Rol no válido" }),
  }),
  email: z.string().email("Correo electrónico inválido").optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").optional(),
});

export function UserForm({ onSubmit, onCancel, editingUser, roles }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  
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

  useEffect(() => {
    if (editingUser) {
      form.reset({
        username: editingUser.username,
        role: editingUser.role,
        email: editingUser.email || "",
        password: "", // Don't populate password when editing
      });
    } else {
      form.reset(defaultValues);
    }
  }, [editingUser, form]);

  const handleSubmit = async (values: z.infer<typeof userSchema>) => {
    setLoading(true);
    try {
      // If editing, we don't need password or email
      if (editingUser) {
        const { password, email, ...updateData } = values;
        await onSubmit({
          id: editingUser.id,
          ...updateData,
        });
      } else {
        // Creating new user requires email and password
        if (!values.email || !values.password) {
          toast.error("El correo y la contraseña son requeridos para crear un usuario.");
          setLoading(false);
          return;
        }
        await onSubmit(values);
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

            {!editingUser && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input placeholder="******" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
