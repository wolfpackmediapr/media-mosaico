
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const makeUserAdmin = async (email: string) => {
  try {
    console.log(`Attempting to make ${email} an administrator`);
    
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
};
