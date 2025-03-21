
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./components/layout/Layout";
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
import { 
  GeneralSettings as ConfiguracionGeneral,
  NotificationsSettings as ConfiguracionAlertas,
  UsersSettings as ConfiguracionUsuarios,
  ClientsSettings as ConfiguracionClientes,
  NotificationMonitoring
} from "./pages/configuracion";
import MediaSettings from "./pages/configuracion/MediaSettings";
import CategoriesSettings from "./pages/configuracion/categories/CategoriesSettings";
import TvSettings from "./pages/configuracion/TvSettings";
import Ayuda from "./pages/Ayuda";
import Auth from "./pages/Auth";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";
import { Toaster } from "@/components/ui/sonner";
import RealTimeAlertsProvider from "./components/notifications/RealTimeAlertsProvider";
import { seedMediaOutlets } from "./services/media/mediaImportService";
import { defaultCsvData } from "./services/media/defaultMediaData";
import { seedTvData } from "./services/tv/channelService";

import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const queryClient = new QueryClient(); 

  useEffect(() => {
    const token = localStorage.getItem("sb-access-token");
    if (token) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);
  
  // Initialize the application data (media outlets and TV data)
  useEffect(() => {
    const initializeData = async () => {
      if (!initialized) {
        try {
          // First seed the media outlets
          await seedMediaOutlets(defaultCsvData);
          console.log("Media outlets seeded successfully");
          
          // Then seed the TV data
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
        <BrowserRouter>
          <RealTimeAlertsProvider>
            <Routes>
              <Route path="/" element={<Layout><Outlet /></Layout>}>
                <Route index element={<Index />} />
                <Route path="tv" element={<Tv />} />
                <Route path="radio" element={<Radio />} />
                <Route path="prensa" element={<Prensa />} />
                <Route path="prensa-escrita" element={<PrensaEscrita />} />
                <Route path="redes-sociales" element={<RedesSociales />} />
                <Route path="notificaciones" element={<Notificaciones />} />
                <Route path="reportes" element={<Reportes />} />
                <Route path="envio-alertas" element={<EnvioAlertas />} />
                <Route path="ajustes" element={<Ajustes />} />
                <Route path="ajustes/*" element={<Outlet />}>
                  <Route path="general" element={<ConfiguracionGeneral />} />
                  <Route path="general/medios" element={<MediaSettings />} />
                  <Route path="general/categorias" element={<CategoriesSettings />} />
                  <Route path="general/*" element={<ConfiguracionGeneral />} />
                  <Route path="usuarios" element={<ConfiguracionUsuarios />} />
                  <Route path="usuarios/*" element={<ConfiguracionUsuarios />} />
                  <Route path="clientes" element={<ConfiguracionClientes />} />
                  <Route path="clientes/*" element={<ConfiguracionClientes />} />
                  <Route path="notificaciones" element={<ConfiguracionAlertas />} />
                  <Route path="monitoreo-notificaciones" element={<NotificationMonitoring />} />
                  <Route path="tv" element={<TvSettings />} />
                  <Route path="tv/*" element={<TvSettings />} />
                </Route>
                <Route path="ayuda" element={<Ayuda />} />
              </Route>
              <Route path="auth" element={<Auth />} />
              <Route path="registro" element={<Registro />} />
              <Route path="recuperar-password" element={<RecuperarPassword />} />
            </Routes>
            <Toaster />
          </RealTimeAlertsProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
