
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        setIsCheckingRole(true);
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (error) {
            // If the error is that no rows were returned, the profile doesn't exist yet
            if (error.code === 'PGRST116') {
              console.log('User profile not found, creating default profile');
              
              // Create a default profile for the user with 'data_entry' role
              const { error: insertError } = await supabase
                .from('user_profiles')
                .insert({ 
                  id: user.id, 
                  username: user.email?.split('@')[0] || 'user', 
                  role: 'data_entry' 
                });
              
              if (insertError) {
                console.error('Error creating user profile:', insertError);
              } else {
                setUserRole('data_entry');
              }
            } else {
              console.error('Error fetching user role:', error);
            }
          } else {
            setUserRole(data?.role || null);
          }
        } catch (error) {
          console.error('Error in role check:', error);
        } finally {
          setIsCheckingRole(false);
        }
      } else if (!authLoading) {
        // Reset role when user is not authenticated
        setUserRole(null);
      }
    };

    checkUserRole();
  }, [user, authLoading]);

  // Show loading state while checking auth or role
  if (authLoading || isCheckingRole) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary mb-4" />
        <p className="text-muted-foreground">Verificando autenticación...</p>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    // Save the current location to redirect back after login
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/auth" replace />;
  }

  // Redirect to home if admin-only route but user is not an admin
  if (adminOnly && userRole !== 'administrator') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
