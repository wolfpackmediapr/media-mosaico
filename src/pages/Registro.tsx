import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Registro = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas no coinciden",
      });
      return;
    }

    if (!identifier) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes proporcionar un correo electrónico o nombre de usuario",
      });
      return;
    }

    setLoading(true);

    try {
      // Determine if the identifier is an email or username
      const isEmail = identifier.includes('@');
      const email = isEmail ? identifier : `${identifier}@temporary.com`;
      const username = isEmail ? identifier.split('@')[0] : identifier;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: username,
          }
        },
      });

      if (error) throw error;

      toast({
        title: "Registro exitoso",
        description: isEmail 
          ? "Por favor verifica tu correo electrónico para continuar."
          : "Tu cuenta ha sido creada exitosamente.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>
            Ingresa tus datos para registrarte
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegistro}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Correo electrónico o nombre de usuario</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="correo@ejemplo.com o usuario123"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
    </div>
  );
};

export default Registro;