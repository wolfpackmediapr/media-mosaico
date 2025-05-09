
import { useAuth } from "@/context/AuthContext";

export const useAuthStatus = () => {
  const { user, isLoading } = useAuth();
  
  return {
    isAuthenticated: isLoading ? null : !!user,
    isLoading
  };
};
