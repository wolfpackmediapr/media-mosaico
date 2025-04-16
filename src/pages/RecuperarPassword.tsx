
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ArrowLeft } from "lucide-react";
import { z } from "zod";

const emailSchema = z
  .string()
  .email({ message: "Ingrese un correo electrónico válido" })
  .min(1, { message: "El correo electrónico es obligatorio" });

const RecuperarPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { resetPassword, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Reset errors when input changes
  useEffect(() => {
    setError(null);
  }, [email]);

  const validateEmail = () => {
    try {
      emailSchema.parse(email);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0]?.message || "Correo inválido");
      }
      return false;
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await resetPassword(email);

      if (!error) {
        setEmailSent(true);
        toast.success("Correo enviado", {
          description: "Revisa tu bandeja de entrada para restablecer tu contraseña."
        });
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
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>
          {emailSent 
            ? "Se ha enviado un enlace a tu correo electrónico"
            : "Ingresa tu correo electrónico para recibir instrucciones"}
        </CardDescription>
      </CardHeader>
      
      {emailSent ? (
        <div className="px-6 pb-6">
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md">
            <p className="text-sm">
              Hemos enviado un correo electrónico con instrucciones para restablecer tu contraseña. 
              Por favor revisa tu bandeja de entrada y sigue las instrucciones.
            </p>
            <p className="text-sm mt-2">
              Si no recibes el correo en unos minutos, revisa tu carpeta de spam o intenta nuevamente.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={() => navigate("/auth")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio de sesión
          </Button>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} noValidate>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error ? "border-red-500" : ""}
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : undefined}
                required
              />
              {error && (
                <p id="email-error" className="text-sm text-red-500">
                  {error}
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
              Enviar instrucciones
            </Button>
            <Button
              variant="link"
              type="button"
              onClick={() => navigate("/auth")}
            >
              Volver al inicio de sesión
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
};

export default RecuperarPassword;
