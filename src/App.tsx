
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import RealTimeAlertsProvider from "./components/notifications/RealTimeAlertsProvider";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicLayout from "./components/layout/PublicLayout";
import Layout from "./components/layout/Layout";

// Public pages
import Auth from "./pages/Auth";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";

// Protected pages
import Index from "./pages/Index";
import Tv from "./pages/Tv";
import Radio from "./pages/Radio";
import Prensa from "./pages/Prensa";
import PrensaEscrita from "./pages/PrensaEscrita";
import RedesSociales from "./pages/RedesSociales";
import Notificaciones from "./pages/Notificaciones";
import Reportes from "./pages/Reportes";
import EnvioAlertas from "./pages/EnvioAlertas";
import Ajustes from "./pages/Ajustes";
import Ayuda from "./pages/Ayuda";
import MediaMonitoring from "./pages/MediaMonitoring";
import { 
  GeneralSettings,
  NotificationsSettings,
  UsersSettings,
  ClientsSettings,
  NotificationMonitoring,
  RadioSettings,
  PressSettings
} from "./pages/configuracion";
import MediaSettings from "./pages/configuracion/MediaSettings";
import CategoriesSettings from "./pages/configuracion/categories/CategoriesSettings";
import TvSettings from "./pages/configuracion/TvSettings";
import { seedMediaOutlets } from "./services/media/mediaImportService";
import { defaultCsvData } from "./services/media/defaultMediaData";
import { seedTvData } from "@/services/tv";
import { GenresSettings } from "./pages/configuracion/press/GenresSettings";
import { SourcesSettings } from "./pages/configuracion/press/SourcesSettings";
import { SectionsSettings } from "./pages/configuracion/press/SectionsSettings";
import { RatesSettings } from "./pages/configuracion/press/RatesSettings";
import { TvTarifasSettings } from "./pages/configuracion/tv/TvTarifasSettings";
import { ParticipantesSettings } from "./pages/configuracion/participantes/ParticipantesSettings";
import { ParticipantesGestionSettings } from "./pages/configuracion/participantes/ParticipantesGestionSettings";
import { ParticipantesCategoriasSettings } from "./pages/configuracion/participantes/ParticipantesCategoriasSettings";
import { InstitucionesSettings } from "./pages/configuracion/instituciones/InstitucionesSettings";
import { InstitucionesGestionSettings } from "./pages/configuracion/instituciones/InstitucionesGestionSettings";
import { InstitucionesCategoriasSettings } from "./pages/configuracion/instituciones/InstitucionesCategoriasSettings";
import { InstitucionesAgenciasSettings } from "./pages/configuracion/instituciones/InstitucionesAgenciasSettings";
import Admin from "./pages/Admin";

// Publiteca pages import
import PublitecaPrensa from "./pages/publiteca/Prensa";
import PublitecaRadio from "./pages/publiteca/Radio";
import PublitecaTv from "./pages/publiteca/Tv";
import PublitecaRedesSociales from "./pages/publiteca/RedesSociales";

import "./App.css";

function App() {
  const [initialized, setInitialized] = useState(false);
  const queryClient = new QueryClient();

  useEffect(() => {
    const initializeData = async () => {
      if (!initialized) {
        try {
          await seedMediaOutlets(defaultCsvData);
          console.log("Media outlets seeded successfully");
          
          await seedTvData();
          console.log("TV data seeded successfully");
          
          setInitialized(true);
        } catch (error) {
          console.error("Error initializing data:", error);
        }
      }
    };
    
    initializeData();
  }, [initialized]);
  
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <RealTimeAlertsProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/auth" element={
                  <PublicLayout>
                    <Auth />
                  </PublicLayout>
                } />
                <Route path="/registro" element={
                  <PublicLayout>
                    <Registro />
                  </PublicLayout>
                } />
                <Route path="/recuperar-password" element={
                  <PublicLayout>
                    <RecuperarPassword />
                  </PublicLayout>
                } />
                
                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <Index />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                {/* Redirect root to dashboard when authenticated */}
                <Route path="/" element={<Navigate to="/auth" replace />} />
                
                {/* Protected app routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <Outlet />
                    </Layout>
                  </ProtectedRoute>
                }>
                  {/* Admin-only routes */}
                  <Route path="admin" element={
                    <ProtectedRoute adminOnly>
                      <Admin />
                    </ProtectedRoute>
                  } />
                  <Route path="tv" element={
                    <ProtectedRoute adminOnly>
                      <Tv />
                    </ProtectedRoute>
                  } />
                  
                  {/* Radio module - accessible by all users */}
                  <Route path="radio" element={<Radio />} />
                  
                  {/* Admin-only routes */}
                  <Route path="prensa" element={
                    <ProtectedRoute adminOnly>
                      <Prensa />
                    </ProtectedRoute>
                  } />
                  <Route path="prensa-escrita" element={
                    <ProtectedRoute adminOnly>
                      <PrensaEscrita />
                    </ProtectedRoute>
                  } />
                  <Route path="redes-sociales" element={
                    <ProtectedRoute adminOnly>
                      <RedesSociales />
                    </ProtectedRoute>
                  } />
                  <Route path="notificaciones" element={
                    <ProtectedRoute adminOnly>
                      <Notificaciones />
                    </ProtectedRoute>
                  } />
                  <Route path="reportes" element={
                    <ProtectedRoute adminOnly>
                      <Reportes />
                    </ProtectedRoute>
                  } />
                  <Route path="envio-alertas" element={
                    <ProtectedRoute adminOnly>
                      <EnvioAlertas />
                    </ProtectedRoute>
                  } />
                  <Route path="media-monitoring" element={
                    <ProtectedRoute adminOnly>
                      <MediaMonitoring />
                    </ProtectedRoute>
                  } />
                  
                  {/* Settings routes */}
                  <Route path="ajustes" element={<Ajustes />} />
                  <Route path="ajustes/*" element={<Outlet />}>
                    {/* Admin-only settings */}
                    <Route path="general" element={
                      <ProtectedRoute adminOnly>
                        <GeneralSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="general/medios" element={
                      <ProtectedRoute adminOnly>
                        <MediaSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="general/categorias" element={
                      <ProtectedRoute adminOnly>
                        <CategoriesSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="general/*" element={
                      <ProtectedRoute adminOnly>
                        <GeneralSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="usuarios" element={
                      <ProtectedRoute adminOnly>
                        <UsersSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="usuarios/*" element={
                      <ProtectedRoute adminOnly>
                        <UsersSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="clientes" element={
                      <ProtectedRoute adminOnly>
                        <ClientsSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="clientes/*" element={
                      <ProtectedRoute adminOnly>
                        <ClientsSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="notificaciones" element={
                      <ProtectedRoute adminOnly>
                        <NotificationsSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="monitoreo-notificaciones" element={
                      <ProtectedRoute adminOnly>
                        <NotificationMonitoring />
                      </ProtectedRoute>
                    } />
                    <Route path="tv" element={
                      <ProtectedRoute adminOnly>
                        <TvSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="tv/tarifas" element={
                      <ProtectedRoute adminOnly>
                        <TvTarifasSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="tv/*" element={
                      <ProtectedRoute adminOnly>
                        <TvSettings />
                      </ProtectedRoute>
                    } />
                    
                    {/* Radio settings - accessible by all users */}
                    <Route path="radio" element={<RadioSettings />} />
                    <Route path="radio/*" element={<RadioSettings />} />
                    
                    {/* Admin-only settings */}
                    <Route path="prensa" element={
                      <ProtectedRoute adminOnly>
                        <PressSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="prensa/generos" element={
                      <ProtectedRoute adminOnly>
                        <GenresSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="prensa/fuentes" element={
                      <ProtectedRoute adminOnly>
                        <SourcesSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="prensa/secciones" element={
                      <ProtectedRoute adminOnly>
                        <SectionsSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="prensa/tarifas" element={
                      <ProtectedRoute adminOnly>
                        <RatesSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="prensa/*" element={
                      <ProtectedRoute adminOnly>
                        <PressSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="participantes" element={
                      <ProtectedRoute adminOnly>
                        <ParticipantesSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="participantes/gestion" element={
                      <ProtectedRoute adminOnly>
                        <ParticipantesGestionSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="participantes/categorias" element={
                      <ProtectedRoute adminOnly>
                        <ParticipantesCategoriasSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="instituciones" element={
                      <ProtectedRoute adminOnly>
                        <InstitucionesSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="instituciones/gestion" element={
                      <ProtectedRoute adminOnly>
                        <InstitucionesGestionSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="instituciones/categorias" element={
                      <ProtectedRoute adminOnly>
                        <InstitucionesCategoriasSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="instituciones/agencias" element={
                      <ProtectedRoute adminOnly>
                        <InstitucionesAgenciasSettings />
                      </ProtectedRoute>
                    } />
                  </Route>
                  
                  {/* Help route - accessible by all users */}
                  <Route path="ayuda" element={<Ayuda />} />

                  {/* Admin-only Publiteca routes */}
                  <Route path="publiteca">
                    <Route path="prensa" element={
                      <ProtectedRoute adminOnly>
                        <PublitecaPrensa />
                      </ProtectedRoute>
                    } />
                    <Route path="radio" element={
                      <ProtectedRoute adminOnly>
                        <PublitecaRadio />
                      </ProtectedRoute>
                    } />
                    <Route path="tv" element={
                      <ProtectedRoute adminOnly>
                        <PublitecaTv />
                      </ProtectedRoute>
                    } />
                    <Route path="redes-sociales" element={
                      <ProtectedRoute adminOnly>
                        <PublitecaRedesSociales />
                      </ProtectedRoute>
                    } />
                  </Route>
                </Route>
                
                {/* Catch-all route */}
                <Route path="*" element={<Navigate to="/auth" replace />} />
              </Routes>
              <Toaster />
            </RealTimeAlertsProvider>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
