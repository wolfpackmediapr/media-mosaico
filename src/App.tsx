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
import Auth from "./pages/Auth";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";
import Ayuda from "./pages/Ayuda";
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
import { Toaster } from "@/components/ui/sonner";
import RealTimeAlertsProvider from "./components/notifications/RealTimeAlertsProvider";
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
