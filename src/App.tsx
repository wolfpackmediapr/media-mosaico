
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import Tv from "./pages/Tv";
import Radio from "./pages/Radio";
import Prensa from "./pages/Prensa";
import PrensaEscrita from "./pages/PrensaEscrita";
import RedesSociales from "./pages/RedesSociales";
import Notificaciones from "./pages/Notificaciones";
import EnvioAlertas from "./pages/EnvioAlertas";
import Reportes from "./pages/Reportes";
import Ayuda from "./pages/Ayuda";
import Ajustes from "./pages/Ajustes";
import Auth from "./pages/Auth";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

// Import settings pages
import { GeneralSettings, MediaSettings, ClientsSettings } from "./pages/configuracion";

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
      <ThemeProvider defaultTheme="light" storageKey="app-theme">
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
                <Route path="/prensa-escrita" element={<PrensaEscrita />} />
                <Route path="/redes-sociales" element={<RedesSociales />} />
                <Route path="/notificaciones" element={<Notificaciones />} />
                <Route path="/envio-alertas" element={<EnvioAlertas />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="/ayuda" element={<Ayuda />} />
                <Route path="/ajustes" element={<Ajustes />} />
                
                {/* Configuration routes */}
                <Route path="/ajustes/general" element={<GeneralSettings />} />
                <Route path="/ajustes/general/medios" element={<ComingSoon title="Configuración de Medios" />} />
                <Route path="/ajustes/general/categorias" element={<ComingSoon title="Configuración de Categorías" />} />
                
                <Route path="/ajustes/usuarios" element={<ComingSoon title="Usuarios de Administración" />} />
                <Route path="/ajustes/usuarios/administradores" element={<ComingSoon title="Administradores" />} />
                <Route path="/ajustes/usuarios/permisos" element={<ComingSoon title="Permisos de Usuarios" />} />
                
                <Route path="/ajustes/clientes" element={<ClientsSettings />} />
                <Route path="/ajustes/clientes/gestion" element={<ComingSoon title="Gestión de Clientes" />} />
                <Route path="/ajustes/clientes/permisos" element={<ComingSoon title="Permisos de Clientes" />} />
                
                <Route path="/ajustes/prensa" element={<ComingSoon title="Configuración de Prensa" />} />
                <Route path="/ajustes/prensa/generos" element={<ComingSoon title="Géneros de Prensa" />} />
                <Route path="/ajustes/prensa/fuentes" element={<ComingSoon title="Fuentes de Prensa" />} />
                <Route path="/ajustes/prensa/secciones" element={<ComingSoon title="Secciones de Prensa" />} />
                <Route path="/ajustes/prensa/tarifas" element={<ComingSoon title="Tarifas de Prensa" />} />
                
                <Route path="/ajustes/radio" element={<ComingSoon title="Configuración de Radio" />} />
                <Route path="/ajustes/radio/programas" element={<ComingSoon title="Programas de Radio" />} />
                <Route path="/ajustes/radio/tarifas" element={<ComingSoon title="Tarifas de Radio" />} />
                
                <Route path="/ajustes/tv" element={<ComingSoon title="Configuración de TV" />} />
                <Route path="/ajustes/tv/programas" element={<ComingSoon title="Programas de TV" />} />
                <Route path="/ajustes/tv/tarifas" element={<ComingSoon title="Tarifas de TV" />} />
                
                <Route path="/ajustes/participantes" element={<ComingSoon title="Participantes de la Noticia" />} />
                <Route path="/ajustes/participantes/gestion" element={<ComingSoon title="Gestión de Participantes" />} />
                <Route path="/ajustes/participantes/categorias" element={<ComingSoon title="Categorías de Participantes" />} />
                
                <Route path="/ajustes/instituciones" element={<ComingSoon title="Instituciones y Agencias" />} />
                <Route path="/ajustes/instituciones/gestion" element={<ComingSoon title="Gestión de Instituciones" />} />
                <Route path="/ajustes/instituciones/categorias" element={<ComingSoon title="Categorías de Instituciones" />} />
                <Route path="/ajustes/instituciones/agencias" element={<ComingSoon title="Agencias" />} />
                
                {/* Add redirect from old route to new route */}
                <Route path="/alertas" element={<Navigate to="/notificaciones" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Sonner />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Placeholder component for routes that are not yet implemented
function ComingSoon({ title }: { title: string }) {
  return (
    <SettingsLayout title={title}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Esta sección está en desarrollo</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-6">
          <Settings2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-xl font-medium">Próximamente</h3>
        <p className="mt-2 text-center text-muted-foreground max-w-md">
          Estamos trabajando en esta funcionalidad. Estará disponible pronto.
        </p>
        <Button asChild className="mt-6">
          <Link to="/ajustes">Volver a Configuración</Link>
        </Button>
      </CardContent>
    </SettingsLayout>
  );
}

export default App;
