
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

// Form validation schema
const formSchema = z.object({
  identifier: z.string().min(3, { message: "Debe tener al menos 3 caracteres" }),
  password: z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .regex(/[A-Z]/, { message: "La contraseña debe contener al menos una letra mayúscula" })
    .regex(/[0-9]/, { message: "La contraseña debe contener al menos un número" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"]
});

const Registro = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ 
    identifier?: string; 
    password?: string; 
    confirmPassword?: string; 
  }>({});
  
  const navigate = useNavigate();
  const { signUp, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Reset errors when inputs change
  useEffect(() => {
    setErrors({});
  }, [identifier, password, confirmPassword]);

  const validateForm = () => {
    try {
      formSchema.parse({ identifier, password, confirmPassword });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Determine if the identifier is an email or username
      const isEmail = identifier.includes('@');
      const email = isEmail ? identifier : `${identifier}@temporary.com`;
      const username = isEmail ? identifier.split('@')[0] : identifier;

      const { error } = await signUp(email, password, {
        username: username,
      });

      if (!error) {
        toast.success(isEmail 
          ? "Por favor verifica tu correo electrónico para continuar."
          : "Tu cuenta ha sido creada exitosamente.");
        navigate("/auth");
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
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          Ingresa tus datos para registrarte
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleRegistro} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Correo electrónico o nombre de usuario</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="correo@ejemplo.com o usuario123"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={errors.identifier ? "border-red-500" : ""}
              aria-invalid={!!errors.identifier}
              aria-describedby={errors.identifier ? "identifier-error" : undefined}
              required
            />
            {errors.identifier && (
              <p id="identifier-error" className="text-sm text-red-500">
                {errors.identifier}
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
            {!errors.password && (
              <ul className="text-xs text-gray-500 mt-1 space-y-1">
                <li className={password.length >= 8 ? "text-green-500" : ""}>
                  • Al menos 8 caracteres
                </li>
                <li className={/[A-Z]/.test(password) ? "text-green-500" : ""}>
                  • Al menos una letra mayúscula
                </li>
                <li className={/[0-9]/.test(password) ? "text-green-500" : ""}>
                  • Al menos un número
                </li>
              </ul>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="text-sm text-red-500">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
            aria-busy={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Registrarse
          </Button>
          <Button
            variant="link"
            type="button"
            onClick={() => navigate("/auth")}
            className="mt-4"
          >
            ¿Ya tienes cuenta? Inicia sesión
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default Registro;
