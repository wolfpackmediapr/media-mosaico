
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";

// Email validation schema
const emailSchema = z
  .string()
  .email({ message: "Ingrese un correo electrónico válido" })
  .min(1, { message: "El correo electrónico es obligatorio" });

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres" });

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const navigate = useNavigate();
  const { signIn, user, session } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Check for redirect path stored in session storage
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      // Remove the stored path to prevent unwanted redirects on future login
      sessionStorage.removeItem('redirectAfterLogin');
      // Navigate to the stored path or fallback to home
      navigate(redirectPath || "/");
    }
  }, [user, navigate]);

  // Reset errors when inputs change
  useEffect(() => {
    setErrors({});
  }, [email, password]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        newErrors.email = error.errors[0]?.message || "Correo inválido";
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        newErrors.password = error.errors[0]?.message || "Contraseña inválida";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (!error) {
        toast.success("Inicio de sesión exitoso", {
          description: "Bienvenido de nuevo",
        });
        // Navigation will be handled by the useEffect when user state updates
      }
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return null; // Already handled by useEffect redirect
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleAuth} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? "border-red-500" : ""}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              required
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-red-500">
                {errors.email}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p id="password-error" className="text-sm text-red-500">
                {errors.password}
              </p>
            )}
          </div>
          
          <Button
            variant="link"
            className="px-0 text-sm"
            type="button"
            onClick={() => navigate("/recuperar-password")}
          >
            ¿Olvidaste tu contraseña?
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
            aria-busy={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Iniciar sesión
          </Button>
          <Button
            variant="link"
            type="button"
            onClick={() => navigate("/registro")}
            className="mt-4"
          >
            ¿No tienes cuenta? Regístrate
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default Auth;
