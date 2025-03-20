
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import Prensa from "./pages/Prensa";
import RedesSociales from "./pages/RedesSociales";
import Radio from "./pages/Radio";
import Tv from "./pages/Tv";
import PrensaEscrita from "./pages/PrensaEscrita";
import Reportes from "./pages/Reportes";
import Ajustes from "./pages/Ajustes";
import Ayuda from "./pages/Ayuda";
import EnvioAlertas from "./pages/EnvioAlertas";
import Notificaciones from "./pages/Notificaciones";
import Auth from "./pages/Auth";
import Registro from "./pages/Registro";
import RecuperarPassword from "./pages/RecuperarPassword";
import ClientsSettings from "./pages/configuracion/ClientsSettings";
import UsersSettings from "./pages/configuracion/UsersSettings";
import MediaSettings from "./pages/configuracion/MediaSettings";
import NotificationsSettings from "./pages/configuracion/NotificationsSettings";
import NotificationMonitoring from "./pages/configuracion/NotificationMonitoring";

function App() {
  return (
    <Router>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-password" element={<RecuperarPassword />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="prensa" element={<Prensa />} />
            <Route path="redes-sociales" element={<RedesSociales />} />
            <Route path="radio" element={<Radio />} />
            <Route path="tv" element={<Tv />} />
            <Route path="prensa-escrita" element={<PrensaEscrita />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="configuracion">
              <Route path="clientes" element={<ClientsSettings />} />
              <Route path="usuarios" element={<UsersSettings />} />
              <Route path="medios" element={<MediaSettings />} />
              <Route path="notificaciones" element={<NotificationsSettings />} />
              <Route path="monitoreo-notificaciones" element={<NotificationMonitoring />} />
            </Route>
            <Route path="notificaciones" element={<Notificaciones />} />
            <Route path="ayuda" element={<Ayuda />} />
            <Route path="envio-alertas" element={<EnvioAlertas />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </Router>
  );
}

export default App;
