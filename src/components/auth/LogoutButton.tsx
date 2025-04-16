
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Use useCallback to avoid unnecessary recreation of the function on rerenders
  const makeUserAdmin = useCallback(async (email: string) => {
    try {
      // First, check if the user exists in auth.users (we can only do this via our custom RPC function)
      const { data: users, error: userError } = await supabase
        .rpc('get_users_email', { 
          user_ids: [] // This will return all users since we can't directly filter by email
        });

      if (userError) {
        console.error("Error finding users:", userError);
        return false;
      }

      // Find the user with the matching email
      const user = users.find(u => u.email === email);
      
      if (!user) {
        console.log(`Admin user ${email} not found yet. Will try again later.`);
        return false;
      }

      // Check if the user already has a profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error("Error checking user profile:", profileError);
        return false;
      }

      // If the profile exists, update it to administrator role
      if (existingProfile) {
        if (existingProfile.role === 'administrator') {
          console.log(`User ${email} is already an administrator`);
          return true;
        }
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ role: 'administrator' })
          .eq('id', user.id);

        if (updateError) {
          console.error("Error updating user role:", updateError);
          return false;
        }
        
        console.log(`User ${email} role updated to administrator`);
      } 
      // If the profile doesn't exist, create it with administrator role
      else {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({ 
            id: user.id, 
            username: email.split('@')[0], 
            role: 'administrator' 
          });

        if (insertError) {
          console.error("Error creating user profile:", insertError);
          return false;
        }
        
        console.log(`Administrator profile created for ${email}`);
      }

      return true;
    } catch (error) {
      console.error("Error in makeUserAdmin function:", error);
      return false;
    }
  }, []);

  // Make the wolfpackmediapr@gmail.com user an admin
  useEffect(() => {
    const ADMIN_EMAIL = "wolfpackmediapr@gmail.com";
    const setAdmin = async () => {
      await makeUserAdmin(ADMIN_EMAIL);
    };
    
    setAdmin();
    // We don't need to include makeUserAdmin in dependencies because it's wrapped in useCallback
  }, [makeUserAdmin]);

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
