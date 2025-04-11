
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

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

  // One-time function to update the administrator role
  useEffect(() => {
    const makeAdmin = async () => {
      try {
        // First find the user by email
        const { data: userData, error: userError } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', 'wolfpackmediapr@gmail.com')
          .single();

        if (userError) {
          console.error("Error finding user:", userError);
          return;
        }

        if (!userData) {
          console.error("User not found");
          return;
        }

        // Update the user's role to administrator
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ role: 'administrator' })
          .eq('id', userData.id);

        if (updateError) {
          console.error("Error updating user role:", updateError);
          return;
        }

        console.log("User wolfpackmediapr@gmail.com successfully set as administrator");
        toast.success("El usuario wolfpackmediapr@gmail.com ahora es administrador");
      } catch (error) {
        console.error("Error in makeAdmin function:", error);
      }
    };

    makeAdmin();
  }, []);

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
