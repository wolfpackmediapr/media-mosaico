
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  showIcon?: boolean;
}

const LogoutButton = ({ 
  variant = "ghost", 
  showIcon = true 
}: LogoutButtonProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Sesión cerrada correctamente");
      navigate("/auth");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <Button variant={variant} onClick={handleLogout} className="flex items-center">
      {showIcon && <LogOut className="h-4 w-4 mr-2" />}
      Cerrar Sesión
    </Button>
  );
};

export default LogoutButton;
