
import { useState } from "react";
import { UserProfile } from "@/services/users/userService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define form schemas
const userFormSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  role: z.enum(["administrator", "data_entry"], {
    required_error: "Debes seleccionar un rol",
  }),
});

const newUserFormSchema = userFormSchema.extend({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

interface UserFormProps {
  user: UserProfile | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isEditing: boolean;
}

export function UserForm({ user, onSubmit, onCancel, isEditing }: UserFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<any>({
    resolver: zodResolver(isEditing ? userFormSchema : newUserFormSchema),
    defaultValues: isEditing
      ? {
          username: user?.username || "",
          role: user?.role || "data_entry",
        }
      : {
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "data_entry",
        },
  });

  const handleSubmit = (data: any) => {
    try {
      setError(null);
      if (isEditing && user) {
        // Update existing user
        onSubmit({
          ...user,
          ...data,
        });
      } else {
        // Create new user
        onSubmit(data);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="p-4 bg-muted/50 rounded-lg border mb-6">
      <h3 className="text-lg font-medium mb-4">
        {isEditing ? "Editar Usuario" : "Agregar Nuevo Usuario"}
      </h3>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de usuario</FormLabel>
                  <FormControl>
                    <Input placeholder="usuario123" {...field} />
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
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="administrator">Administrador</SelectItem>
                      <SelectItem value="data_entry">Entrada de datos</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="******" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="******" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? "Actualizar" : "Crear Usuario"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
