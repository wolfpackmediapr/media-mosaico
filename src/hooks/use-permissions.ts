
import { useAuth } from "@/context/AuthContext";

export type ModulePermission = 'full_access' | 'radio_only' | 'no_access';

export function usePermissions() {
  const { user } = useAuth();
  
  // Function to check if current user is an administrator
  const isAdmin = (): boolean => {
    return user?.user_metadata?.role === 'administrator';
  };
  
  // Function to check module access permissions
  const checkModuleAccess = (module: string): ModulePermission => {
    // If no user, no access
    if (!user) return 'no_access';
    
    // Administrators have full access to everything
    if (isAdmin()) return 'full_access';
    
    // Data entry users only have access to the Radio module
    if (module === 'radio') return 'radio_only';
    
    // No access to other modules for data entry users
    return 'no_access';
  };

  // Function to check if user can access a specific route
  const canAccessRoute = (path: string): boolean => {
    // If no user, no access
    if (!user) return false;
    
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
  };
}
