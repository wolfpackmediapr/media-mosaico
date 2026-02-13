
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { toast } from "sonner";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const sessionRef = useRef<Session | null>(null);
  const loadingRef = useRef(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('[AuthContext] Auth state change event:', event);
        
        if (event === 'SIGNED_OUT') {
          sessionRef.current = null;
          setSession(null);
          setUser(null);
        } else {
          const prevUserId = sessionRef.current?.user?.id;
          const newUserId = currentSession?.user?.id;
          if (newUserId !== prevUserId) {
            sessionRef.current = currentSession;
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
          }
        }
        
        if (loadingRef.current) {
          loadingRef.current = false;
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      sessionRef.current = currentSession;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      loadingRef.current = false;
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper function to create user profile
  const createUserProfile = async (userId: string, metadata: any) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert({ 
          id: userId, 
          username: metadata?.username || userId, 
          role: 'data_entry' // Using data_entry as the default role for consistency
        });
      
      if (error) {
        console.error("Error creating user profile:", error);
      }
    } catch (err) {
      console.error("Error in createUserProfile:", err);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Signing in user:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Login error:", error.message);
        toast.error("Error al iniciar sesión", {
          description: error.message === "Invalid login credentials" 
            ? "Credenciales inválidas. Por favor verifique su correo y contraseña." 
            : error.message
        });
      }
      
      return { error };
    } catch (err: any) {
      console.error("Sign in exception:", err);
      toast.error("Error inesperado", {
        description: "No se pudo procesar su solicitud. Intente nuevamente más tarde."
      });
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      // Password strength validation
      if (password.length < 8) {
        const error = new AuthError("Password too short");
        error.message = "La contraseña debe tener al menos 8 caracteres";
        return { error };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      
      if (error) {
        console.error("Signup error:", error.message);
        toast.error("Error al registrarse", {
          description: error.message === "User already registered" 
            ? "El usuario ya existe. Intente iniciar sesión." 
            : error.message
        });
      } else if (data && data.user) {
        // Create a user profile after successful signup with data_entry role
        await createUserProfile(data.user.id, metadata);
        
        toast.success("Cuenta creada exitosamente", {
          description: "Por favor verifique su correo electrónico para continuar."
        });
      }
      
      return { error };
    } catch (err: any) {
      console.error("Sign up exception:", err);
      toast.error("Error inesperado", {
        description: "No se pudo procesar su solicitud. Intente nuevamente más tarde."
      });
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
      toast.error("Error al cerrar sesión");
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) {
        console.error("Password reset error:", error);
        toast.error("Error al restablecer la contraseña", {
          description: error.message
        });
      }
      
      return { error };
    } catch (err: any) {
      console.error("Reset password exception:", err);
      toast.error("Error inesperado", {
        description: "No se pudo procesar su solicitud. Intente nuevamente más tarde."
      });
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
