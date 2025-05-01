
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  showIcon?: boolean;
}

const LogoutButton = ({ 
  variant = "ghost", 
  showIcon = true 
}: LogoutButtonProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      toast.success("Sesión cerrada correctamente");
      navigate("/auth");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast.error("Error al cerrar sesión");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      onClick={handleLogout} 
      className="flex items-center"
      disabled={isLoggingOut}
    >
      {showIcon && <LogOut className="h-4 w-4 mr-2" />}
      {isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
    </Button>
  );
};

export default LogoutButton;
