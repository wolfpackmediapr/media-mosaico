
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModulePermission = 'full_access' | 'radio_only' | 'no_access';

export function usePermissions() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  // Fetch user role from the database
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        setIsRoleLoading(true);
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching user role:', error);
            setUserRole(null);
          } else {
            setUserRole(data?.role || null);
          }
        } catch (error) {
          console.error('Exception fetching role:', error);
          setUserRole(null);
        } finally {
          setIsRoleLoading(false);
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [user]);
  
  // Function to check if current user is an administrator
  const isAdmin = (): boolean => {
    return userRole === 'administrator';
  };
  
  // Function to check module access permissions
  const checkModuleAccess = (module: string): ModulePermission => {
    // If no user or role not loaded yet, no access
    if (!user || isRoleLoading) return 'no_access';
    
    // Administrators have full access to everything
    if (isAdmin()) return 'full_access';
    
    // Data entry users only have access to the Radio module
    if (module === 'radio') return 'radio_only';
    
    // No access to other modules for data entry users
    return 'no_access';
  };

  // Function to check if user can access a specific route
  const canAccessRoute = (path: string): boolean => {
    // If no user or role loading, no access
    if (!user || isRoleLoading) return false;
    
    // Administrators can access all routes
    if (isAdmin()) return true;
    
    // Data entry users can only access specific routes
    // Radio module routes
    if (path === '/radio' || path.startsWith('/radio/')) return true;
    
    // Settings routes - only specific settings for radio
    if (path === '/ajustes/radio' || path.startsWith('/ajustes/radio/')) return true;
    
    // Home route is accessible to all authenticated users
    if (path === '/') return true;
    
    // General routes accessible to all authenticated users
    const allowedRoutes = [
      '/ayuda',
      '/auth',
    ];
    
    if (allowedRoutes.includes(path)) return true;
    
    // By default, deny access
    return false;
  };

  return {
    isAdmin,
    checkModuleAccess,
    canAccessRoute,
    userRole,
    isRoleLoading
  };
}
