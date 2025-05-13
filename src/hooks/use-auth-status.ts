
import { useAuth } from "@/context/AuthContext";

export const useAuthStatus = () => {
  const { user, isLoading } = useAuth();
  
  // For debugging purposes, log the authentication state
  console.log("[useAuthStatus] User:", user, "Loading:", isLoading);
  
  return {
    isAuthenticated: isLoading ? null : !!user
  };
};
