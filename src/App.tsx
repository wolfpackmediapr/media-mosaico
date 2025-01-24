import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import Tv from "./pages/Tv";
import Radio from "./pages/Radio";
import Prensa from "./pages/Prensa";
import Alertas from "./pages/Alertas";
import Reportes from "./pages/Reportes";
import Ayuda from "./pages/Ayuda";
import Ajustes from "./pages/Ajustes";
import Auth from "./pages/Auth";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

const queryClient = new QueryClient();

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/auth"
              element={session ? <Navigate to="/" /> : <Auth />}
            />
            <Route
              path="/registro"
              element={session ? <Navigate to="/" /> : <Registro />}
            />
            <Route
              path="/recuperar-password"
              element={session ? <Navigate to="/" /> : <RecuperarPassword />}
            />
            <Route
              element={!session ? <Navigate to="/auth" /> : <Layout><Outlet /></Layout>}
            >
              <Route path="/" element={<Index />} />
              <Route path="/tv" element={<Tv />} />
              <Route path="/radio" element={<Radio />} />
              <Route path="/prensa" element={<Prensa />} />
              <Route path="/alertas" element={<Alertas />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/ayuda" element={<Ayuda />} />
              <Route path="/ajustes" element={<Ajustes />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
