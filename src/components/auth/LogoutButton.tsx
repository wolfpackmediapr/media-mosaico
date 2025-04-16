
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { makeUserAdmin } from "@/utils/adminUtils";
import { usePermissions } from "@/hooks/use-permissions";

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
  const { userRole } = usePermissions();

  // Make the wolfpackmediapr@gmail.com user an admin
  useEffect(() => {
    const ADMIN_EMAIL = "wolfpackmediapr@gmail.com";
    
    // Only try to set admin if the current user is the admin user
    if (user && user.email === ADMIN_EMAIL) {
      const setAdmin = async () => {
        // Slight delay to ensure auth state is fully loaded
        setTimeout(async () => {
          await makeUserAdmin(ADMIN_EMAIL);
        }, 1000);
      };
      
      setAdmin();
    }
  }, [user]);

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
    <div className="flex items-center gap-2">
      {userRole && (
        <span className="text-sm text-muted-foreground">
          {userRole === 'administrator' 
            ? 'Administrador' 
            : 'Entrada de datos'}
        </span>
      )}
      <Button 
        variant={variant} 
        onClick={handleLogout} 
        className="flex items-center"
        disabled={isLoggingOut}
      >
        {showIcon && <LogOut className="h-4 w-4 mr-2" />}
        {isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
      </Button>
    </div>
  );
};

export default LogoutButton;
