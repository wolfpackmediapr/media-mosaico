
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const makeUserAdmin = async (email: string) => {
  try {
    // We can't directly query auth.users, so we'll use a custom RPC function
    const { data: users, error: userError } = await supabase
      .rpc('get_users_email', { 
        user_ids: [] // This will return all users since we can't directly filter by email
      });

    if (userError) {
      console.error("Error finding users:", userError);
      toast.error("Error al buscar usuarios");
      return false;
    }

    // Find the user with the matching email
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.error("User not found with email:", email);
      toast.error(`Usuario con correo ${email} no encontrado`);
      return false;
    }

    // Update the user's role to administrator
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'administrator' })
      .eq('id', user.id);

    if (updateError) {
      console.error("Error updating user role:", updateError);
      toast.error("Error al actualizar el rol del usuario");
      return false;
    }

    console.log(`User ${email} successfully set as administrator`);
    toast.success(`Usuario ${email} ahora es administrador`);
    return true;
  } catch (error) {
    console.error("Error in makeUserAdmin function:", error);
    toast.error("Error al actualizar el rol del usuario");
    return false;
  }
};

// Execute the function immediately to make wolfpackmediapr@gmail.com an admin
makeUserAdmin("wolfpackmediapr@gmail.com");
