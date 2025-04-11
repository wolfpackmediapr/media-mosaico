
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { makeUserAdmin } from "@/utils/adminUtils";

interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, username, role');
      
      if (profilesError) {
        throw profilesError;
      }
      
      // Get emails using the custom RPC function
      const { data: emailsData, error: emailsError } = await supabase
        .rpc('get_users_email', { 
          user_ids: profiles.map(profile => profile.id)
        });
      
      if (emailsError) {
        throw emailsError;
      }
      
      // Combine the data
      const combinedData = profiles.map(profile => {
        const emailInfo = emailsData.find(e => e.id === profile.id);
        return {
          ...profile,
          email: emailInfo?.email || 'Unknown'
        };
      });
      
      setUsers(combinedData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // Make wolfpackmediapr@gmail.com an admin immediately
    makeUserAdmin("wolfpackmediapr@gmail.com");
  }, []);

  const handleMakeAdmin = async (email: string) => {
    const success = await makeUserAdmin(email);
    if (success) {
      fetchUsers(); // Refresh the user list
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Administración de Usuarios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Usuario</th>
                  <th className="text-left p-2">Correo</th>
                  <th className="text-left p-2">Rol</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-2">{user.username}</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.role === 'administrator' ? 'Administrador' : 'Entrada de datos'}</td>
                    <td className="p-2">
                      {user.role !== 'administrator' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleMakeAdmin(user.email)}
                        >
                          Hacer Admin
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Admin;
