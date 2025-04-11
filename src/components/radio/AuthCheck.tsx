
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AuthCheckProps {
  isAuthenticated: boolean | null;
}

const AuthCheck = ({ isAuthenticated }: AuthCheckProps) => {
  const navigate = useNavigate();

  if (isAuthenticated === false) {
    return (
      <div className="w-full h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Iniciar sesión requerido</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
          Para acceder a la funcionalidad de transcripción de radio, por favor inicia sesión o crea una cuenta.
        </p>
        <Button 
          onClick={() => navigate('/auth')}
          className="flex items-center"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Iniciar sesión
        </Button>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div className="w-full h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return null;
};

export default AuthCheck;
