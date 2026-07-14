
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { useSectionPermissions, type SectionKey } from "@/hooks/use-section-permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  section?: SectionKey;
  /**
   * When provided, the user must have access to ALL of these sections
   * (in addition to `section` if it is also passed).
   */
  sections?: SectionKey[];
  /**
   * When provided, the user must have access to AT LEAST ONE of these sections.
   */
  anySection?: SectionKey[];
}

const ProtectedRoute = ({
  children,
  adminOnly = false,
  section,
  sections,
  anySection,
}: ProtectedRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { role, canAccess, canAccessAll, canAccessAny, isLoading: permsLoading } =
    useSectionPermissions();
  const location = useLocation();

  // Show loading state while checking auth or permissions
  if (authLoading || (user && permsLoading)) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary mb-4" />
        <p className="text-muted-foreground">Verificando autenticación...</p>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to="/auth" replace />;
  }

  // If we couldn't determine a role after loading, fail closed
  if (!role) {
    return <Navigate to="/" replace />;
  }

  // Redirect to home if admin-only route but user is not an admin
  if (adminOnly && role !== 'administrator') {
    return <Navigate to="/" replace />;
  }

  // Section-based access checks (admins bypass via canAccess helpers).
  if (section && !canAccess(section)) {
    return <Navigate to="/" replace />;
  }
  if (sections && !canAccessAll(sections)) {
    return <Navigate to="/" replace />;
  }
  if (anySection && !canAccessAny(anySection)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
