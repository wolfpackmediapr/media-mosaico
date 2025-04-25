
import React, { useState, useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import RealTimeAlertsProvider from "./components/notifications/RealTimeAlertsProvider";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicLayout from "./components/layout/PublicLayout";
import Layout from "./components/layout/Layout";
import PageLoader from "./components/common/PageLoader";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { initializeData } from "./services/initialization/initService";
import { Index, lazyRoutes, settingsRoutes, publitecaRoutes } from "./config/routes";

// Public pages
import Auth from "./pages/Auth";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";

function App() {
  const [initialized, setInitialized] = useState(false);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30000,
        refetchOnWindowFocus: false
      }
    }
  });

  useEffect(() => {
    const initialize = async () => {
      if (!initialized) {
        const success = await initializeData();
        if (success) {
          setInitialized(true);
        }
      }
    };
    
    initialize();
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
                
                {/* Protected index route */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <Index />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } />
                
                {/* Protected app routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <Outlet />
                        </Suspense>
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }>
                  {/* Main routes */}
                  <Route path="admin" element={<lazyRoutes.Admin />} />
                  <Route path="tv" element={<lazyRoutes.Tv />} />
                  <Route path="radio" element={<lazyRoutes.Radio />} />
                  <Route path="prensa" element={<lazyRoutes.Prensa />} />
                  <Route path="prensa-escrita" element={<lazyRoutes.PrensaEscrita />} />
                  <Route path="redes-sociales" element={<lazyRoutes.RedesSociales />} />
                  <Route path="notificaciones" element={<lazyRoutes.Notificaciones />} />
                  <Route path="reportes" element={<lazyRoutes.Reportes />} />
                  <Route path="envio-alertas" element={<lazyRoutes.EnvioAlertas />} />
                  <Route path="media-monitoring" element={<lazyRoutes.MediaMonitoring />} />
                  <Route path="ajustes" element={<lazyRoutes.Ajustes />} />

                  {/* Settings routes */}
                  <Route path="ajustes/*" element={<Outlet />}>
                    <Route path="general" element={<settingsRoutes.GeneralSettings />} />
                    <Route path="general/medios" element={<settingsRoutes.MediaSettings />} />
                    <Route path="general/categorias" element={<settingsRoutes.CategoriesSettings />} />
                    <Route path="general/*" element={<settingsRoutes.GeneralSettings />} />
                    <Route path="usuarios" element={<settingsRoutes.UsersSettings />} />
                    <Route path="usuarios/*" element={<settingsRoutes.UsersSettings />} />
                    <Route path="clientes" element={<settingsRoutes.ClientsSettings />} />
                    <Route path="clientes/*" element={<settingsRoutes.ClientsSettings />} />
                    <Route path="notificaciones" element={<settingsRoutes.NotificationsSettings />} />
                    <Route path="monitoreo-notificaciones" element={<settingsRoutes.NotificationMonitoring />} />
                    <Route path="tv" element={<settingsRoutes.TvSettings />} />
                    <Route path="tv/tarifas" element={<settingsRoutes.TvTarifasSettings />} />
                    <Route path="tv/*" element={<settingsRoutes.TvSettings />} />
                    <Route path="radio" element={<settingsRoutes.RadioSettings />} />
                    <Route path="radio/*" element={<settingsRoutes.RadioSettings />} />
                    <Route path="prensa" element={<settingsRoutes.PressSettings />} />
                    <Route path="prensa/generos" element={<settingsRoutes.GenresSettings />} />
                    <Route path="prensa/fuentes" element={<settingsRoutes.SourcesSettings />} />
                    <Route path="prensa/secciones" element={<settingsRoutes.SectionsSettings />} />
                    <Route path="prensa/tarifas" element={<settingsRoutes.RatesSettings />} />
                    <Route path="prensa/*" element={<settingsRoutes.PressSettings />} />
                    <Route path="participantes" element={<settingsRoutes.ParticipantesSettings />} />
                    <Route path="participantes/gestion" element={<settingsRoutes.ParticipantesGestionSettings />} />
                    <Route path="participantes/categorias" element={<settingsRoutes.ParticipantesCategoriasSettings />} />
                    <Route path="instituciones" element={<settingsRoutes.InstitucionesSettings />} />
                    <Route path="instituciones/gestion" element={<settingsRoutes.InstitucionesGestionSettings />} />
                    <Route path="instituciones/categorias" element={<settingsRoutes.InstitucionesCategoriasSettings />} />
                    <Route path="instituciones/agencias" element={<settingsRoutes.InstitucionesAgenciasSettings />} />
                  </Route>

                  <Route path="ayuda" element={<lazyRoutes.Ayuda />} />

                  {/* Publiteca routes */}
                  <Route path="publiteca">
                    <Route path="prensa" element={<publitecaRoutes.PublitecaPrensa />} />
                    <Route path="radio" element={<publitecaRoutes.PublitecaRadio />} />
                    <Route path="tv" element={<publitecaRoutes.PublitecaTv />} />
                    <Route path="redes-sociales" element={<publitecaRoutes.PublitecaRedesSociales />} />
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
