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

// Public pages
import Auth from "./pages/Auth";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";

// Improved error handling for lazy loaded components
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Cargando...</p>
    </div>
  </div>
);

// ErrorBoundary component for catching loading errors
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error("Component Error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center space-y-4 max-w-md p-4 text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Algo salió mal</h2>
            <p className="text-gray-600 dark:text-gray-300">
              No se pudo cargar esta página. Por favor, intenta recargar.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Import directly instead of lazy loading the Index component
import Index from "./pages/Index";

// Keep lazy loading for other components
const Radio = React.lazy(() => import("./pages/Radio"));
const Tv = React.lazy(() => import("./pages/Tv"));
const Prensa = React.lazy(() => import("./pages/Prensa"));
const PrensaEscrita = React.lazy(() => import("./pages/PrensaEscrita"));
const RedesSociales = React.lazy(() => import("./pages/RedesSociales"));
const Notificaciones = React.lazy(() => import("./pages/Notificaciones"));
const Reportes = React.lazy(() => import("./pages/Reportes"));
const EnvioAlertas = React.lazy(() => import("./pages/EnvioAlertas"));
const Ajustes = React.lazy(() => import("./pages/Ajustes"));
const Ayuda = React.lazy(() => import("./pages/Ayuda"));
const MediaMonitoring = React.lazy(() => import("./pages/MediaMonitoring"));
const Admin = React.lazy(() => import("./pages/Admin"));

// Lazy loaded settings pages
const GeneralSettings = React.lazy(() => import("./pages/configuracion/GeneralSettings").then(m => ({ default: m.GeneralSettings })));
const NotificationsSettings = React.lazy(() => import("./pages/configuracion/NotificationsSettings"));
const UsersSettings = React.lazy(() => import("./pages/configuracion/UsersSettings"));
const ClientsSettings = React.lazy(() => import("./pages/configuracion/ClientsSettings"));
const NotificationMonitoring = React.lazy(() => import("./pages/configuracion/NotificationMonitoring"));
const RadioSettings = React.lazy(() => import("./pages/configuracion/RadioSettings"));
const PressSettings = React.lazy(() => import("./pages/configuracion/PressSettings"));
const MediaSettings = React.lazy(() => import("./pages/configuracion/MediaSettings"));
const CategoriesSettings = React.lazy(() => import("./pages/configuracion/categories/CategoriesSettings"));
const TvSettings = React.lazy(() => import("./pages/configuracion/TvSettings"));
const GenresSettings = React.lazy(() => import("./pages/configuracion/press/GenresSettings").then(m => ({ default: m.GenresSettings })));
const SourcesSettings = React.lazy(() => import("./pages/configuracion/press/SourcesSettings").then(m => ({ default: m.SourcesSettings })));
const SectionsSettings = React.lazy(() => import("./pages/configuracion/press/SectionsSettings").then(m => ({ default: m.SectionsSettings })));
const RatesSettings = React.lazy(() => import("./pages/configuracion/press/RatesSettings").then(m => ({ default: m.RatesSettings })));
const TvTarifasSettings = React.lazy(() => import("./pages/configuracion/tv/TvTarifasSettings").then(m => ({ default: m.TvTarifasSettings })));
const ParticipantesSettings = React.lazy(() => import("./pages/configuracion/participantes/ParticipantesSettings"));
const ParticipantesGestionSettings = React.lazy(() => import("./pages/configuracion/participantes/ParticipantesGestionSettings").then(m => ({ default: m.ParticipantesGestionSettings })));
const ParticipantesCategoriasSettings = React.lazy(() => import("./pages/configuracion/participantes/ParticipantesCategoriasSettings").then(m => ({ default: m.ParticipantesCategoriasSettings })));
const InstitucionesSettings = React.lazy(() => import("./pages/configuracion/instituciones/InstitucionesSettings"));
const InstitucionesGestionSettings = React.lazy(() => import("./pages/configuracion/instituciones/InstitucionesGestionSettings").then(m => ({ default: m.InstitucionesGestionSettings })));
const InstitucionesCategoriasSettings = React.lazy(() => import("./pages/configuracion/instituciones/InstitucionesCategoriasSettings").then(m => ({ default: m.InstitucionesCategoriasSettings })));
const InstitucionesAgenciasSettings = React.lazy(() => import("./pages/configuracion/instituciones/InstitucionesAgenciasSettings").then(m => ({ default: m.InstitucionesAgenciasSettings })));

// Lazy loaded publiteca pages
const PublitecaPrensa = React.lazy(() => import("./pages/publiteca/Prensa"));
const PublitecaRadio = React.lazy(() => import("./pages/publiteca/Radio"));
const PublitecaTv = React.lazy(() => import("./pages/publiteca/Tv"));
const PublitecaRedesSociales = React.lazy(() => import("./pages/publiteca/RedesSociales"));

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
                      <ErrorBoundary>
                        <Index />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } />
                
                {/* Redirect root to dashboard when authenticated */}
                <Route path="/" element={<Navigate to="/auth" replace />} />
                
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
                  <Route path="admin" element={<Admin />} />
                  <Route path="tv" element={<Tv />} />
                  <Route path="radio" element={<Radio />} />
                  <Route path="prensa" element={<Prensa />} />
                  <Route path="prensa-escrita" element={<PrensaEscrita />} />
                  <Route path="redes-sociales" element={<RedesSociales />} />
                  <Route path="notificaciones" element={<Notificaciones />} />
                  <Route path="reportes" element={<Reportes />} />
                  <Route path="envio-alertas" element={<EnvioAlertas />} />
                  <Route path="media-monitoring" element={<MediaMonitoring />} />
                  <Route path="ajustes" element={<Ajustes />} />
                  <Route path="ajustes/*" element={<Outlet />}>
                    <Route path="general" element={<GeneralSettings />} />
                    <Route path="general/medios" element={<MediaSettings />} />
                    <Route path="general/categorias" element={<CategoriesSettings />} />
                    <Route path="general/*" element={<GeneralSettings />} />
                    <Route path="usuarios" element={<UsersSettings />} />
                    <Route path="usuarios/*" element={<UsersSettings />} />
                    <Route path="clientes" element={<ClientsSettings />} />
                    <Route path="clientes/*" element={<ClientsSettings />} />
                    <Route path="notificaciones" element={<NotificationsSettings />} />
                    <Route path="monitoreo-notificaciones" element={<NotificationMonitoring />} />
                    <Route path="tv" element={<TvSettings />} />
                    <Route path="tv/tarifas" element={<TvTarifasSettings />} />
                    <Route path="tv/*" element={<TvSettings />} />
                    <Route path="radio" element={<RadioSettings />} />
                    <Route path="radio/*" element={<RadioSettings />} />
                    <Route path="prensa" element={<PressSettings />} />
                    <Route path="prensa/generos" element={<GenresSettings />} />
                    <Route path="prensa/fuentes" element={<SourcesSettings />} />
                    <Route path="prensa/secciones" element={<SectionsSettings />} />
                    <Route path="prensa/tarifas" element={<RatesSettings />} />
                    <Route path="prensa/*" element={<PressSettings />} />
                    <Route path="participantes" element={<ParticipantesSettings />} />
                    <Route path="participantes/gestion" element={<ParticipantesGestionSettings />} />
                    <Route path="participantes/categorias" element={<ParticipantesCategoriasSettings />} />
                    <Route path="instituciones" element={<InstitucionesSettings />} />
                    <Route path="instituciones/gestion" element={<InstitucionesGestionSettings />} />
                    <Route path="instituciones/categorias" element={<InstitucionesCategoriasSettings />} />
                    <Route path="instituciones/agencias" element={<InstitucionesAgenciasSettings />} />
                  </Route>
                  <Route path="ayuda" element={<Ayuda />} />

                  {/* Publiteca routes */}
                  <Route path="publiteca">
                    <Route path="prensa" element={<PublitecaPrensa />} />
                    <Route path="radio" element={<PublitecaRadio />} />
                    <Route path="tv" element={<PublitecaTv />} />
                    <Route path="redes-sociales" element={<PublitecaRedesSociales />} />
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

import { seedMediaOutlets } from "./services/media/mediaImportService";
import { defaultCsvData } from "./services/media/defaultMediaData";
import { seedTvData } from "@/services/tv";

export default App;
