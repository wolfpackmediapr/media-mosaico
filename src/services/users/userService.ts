
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  username: string;
  role: "administrator" | "data_entry";
  created_at: string;
  updated_at: string;
  email?: string; // Added as optional since it comes from a join
}

export async function fetchUsers(): Promise<{ data: UserProfile[] | null; error: PostgrestError | null }> {
  // Join user_profiles with auth.users to get email
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id,
      username,
      role,
      created_at,
      updated_at
    `)
    .order('username');

  if (error) {
    console.error("Error fetching users:", error);
    return { data: null, error };
  }

  // Get emails from auth.users using the user IDs
  if (data && data.length > 0) {
    const userIds = data.map(user => user.id);
    
    // Use a custom RPC function to get emails securely
    const { data: authUsers, error: authError } = await supabase
      .rpc('get_users_email', { user_ids: userIds });

    if (!authError && authUsers) {
      // Create a map of user_id to email
      const emailMap = new Map();
      authUsers.forEach((user: { id: string, email: string }) => {
        emailMap.set(user.id, user.email);
      });
      
      // Add emails to user profiles
      const typedData = data as UserProfile[];
      typedData.forEach(user => {
        user.email = emailMap.get(user.id) || '';
      });
    }
  }

  return { data, error };
}

export async function createUser(
  email: string,
  password: string,
  username: string,
  role: "administrator" | "data_entry"
): Promise<{ data: any | null; error: any | null }> {
  const { data: response, error: invokeError } = await supabase.functions.invoke('create-user', {
    body: { email, password, username, role },
  });

  if (invokeError) {
    console.error("Error creating user:", invokeError);
    return { data: null, error: invokeError };
  }

  if (response?.error) {
    console.error("Error creating user:", response.error);
    return { data: null, error: { message: response.error } };
  }

  return { data: response?.data, error: null };
}

export async function updateUserProfile(
  userId: string,
  updates: { username?: string; role?: "administrator" | "data_entry" }
): Promise<{ data: any | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select();

  return { data, error };
}

export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error: any | null }> {
  // Use our secure RPC function to delete the user
  const { error } = await supabase
    .rpc('delete_user', { user_id: userId });

  if (error) {
    console.error("Error deleting user:", error);
    return { success: false, error };
  }

  return { success: true, error: null };
}
