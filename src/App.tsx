import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/theme-provider";
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
import ConfiguracionGeneral from "./pages/configuracion/ConfiguracionGeneral";
import ConfiguracionAlertas from "./pages/configuracion/ConfiguracionAlertas";
import ConfiguracionUsuarios from "./pages/configuracion/ConfiguracionUsuarios";
import Ayuda from "./pages/Ayuda";
import Auth from "./pages/Auth";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";
import { Toaster } from "@/components/ui/toaster";

import "./App.css";
import RealTimeAlertsProvider from "./components/notifications/RealTimeAlertsProvider";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if the user is logged in
    const token = localStorage.getItem("sb-access-token");
    if (token) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const queryClient = new QueryClient();
  
  return (
    <>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <BrowserRouter>
          <RealTimeAlertsProvider>
            <QueryClientProvider client={queryClient}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Index />} />
                  <Route path="tv" element={<Tv />} />
                  <Route path="radio" element={<Radio />} />
                  <Route path="prensa" element={<Prensa />} />
                  <Route path="prensa-escrita" element={<PrensaEscrita />} />
                  <Route path="redes-sociales" element={<RedesSociales />} />
                  <Route path="notificaciones" element={<Notificaciones />} />
                  <Route path="reportes" element={<Reportes />} />
                  <Route path="enviar-alertas" element={<EnvioAlertas />} />
                  <Route path="configuracion/*" element={<Outlet />}>
                    <Route path="general" element={<ConfiguracionGeneral />} />
                    <Route path="alertas" element={<ConfiguracionAlertas />} />
                    <Route path="usuarios" element={<ConfiguracionUsuarios />} />
                  </Route>
                  <Route path="ayuda" element={<Ayuda />} />
                </Route>
                <Route path="auth" element={<Auth />} />
                <Route path="registro" element={<Registro />} />
                <Route path="recuperar-password" element={<RecuperarPassword />} />
              </Routes>
              <Toaster />
            </QueryClientProvider>
          </RealTimeAlertsProvider>
        </BrowserRouter>
      </ThemeProvider>
    </>
  );
}

export default App;
