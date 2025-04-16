
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { canAccessRoute, isAdmin, isRoleLoading } = usePermissions();

  // Show loading state while checking auth or role
  if (authLoading || isRoleLoading) {
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
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Check route access based on user role
  if (!canAccessRoute(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
