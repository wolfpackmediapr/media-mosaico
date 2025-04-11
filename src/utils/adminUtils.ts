
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const makeUserAdmin = async (email: string) => {
  try {
    // First, check if the user exists in auth.users (we can only do this via our custom RPC function)
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

    // Check if the user already has a profile
    const { data: existingProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error("Error checking user profile:", profileError);
      toast.error("Error al verificar el perfil del usuario");
      return false;
    }

    // If the profile exists, update it to administrator role
    if (existingProfile) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: 'administrator' })
        .eq('id', user.id);

      if (updateError) {
        console.error("Error updating user role:", updateError);
        toast.error("Error al actualizar el rol del usuario");
        return false;
      }
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
        toast.error("Error al crear el perfil del usuario");
        return false;
      }
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
