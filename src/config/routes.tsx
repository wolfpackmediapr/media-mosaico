import React from "react";

// Import directly instead of lazy loading the Index component
import Index from "../pages/Index";

// Keep lazy loading for other components
export const lazyRoutes = {
  Radio: React.lazy(() => import("../pages/Radio")),
  Tv: React.lazy(() => import("../pages/Tv")),
  Prensa: React.lazy(() => import("../pages/Prensa")),
  PrensaEscrita: React.lazy(() => import("../pages/PrensaEscrita")),
  RedesSociales: React.lazy(() => import("../pages/RedesSociales")),
  Notificaciones: React.lazy(() => import("../pages/Notificaciones")),
  Reportes: React.lazy(() => import("../pages/Reportes")),
  EnvioAlertas: React.lazy(() => import("../pages/EnvioAlertas")),
  Ajustes: React.lazy(() => import("../pages/Ajustes")),
  Ayuda: React.lazy(() => import("../pages/Ayuda")),
  MediaMonitoring: React.lazy(() => import("../pages/MediaMonitoring")),
  Admin: React.lazy(() => import("../pages/Admin")),
};

// Lazy loaded settings pages
export const settingsRoutes = {
  GeneralSettings: React.lazy(() => import("../pages/configuracion/GeneralSettings").then(m => ({ default: m.GeneralSettings }))),
  NotificationsSettings: React.lazy(() => import("../pages/configuracion/NotificationsSettings")),
  UsersSettings: React.lazy(() => import("../pages/configuracion/UsersSettings")),
  ClientsSettings: React.lazy(() => import("../pages/configuracion/ClientsSettings")),
  NotificationMonitoring: React.lazy(() => import("../pages/configuracion/NotificationMonitoring")),
  RadioSettings: React.lazy(() => import("../pages/configuracion/RadioSettings")),
  PressSettings: React.lazy(() => import("../pages/configuracion/PressSettings")),
  MediaSettings: React.lazy(() => import("../pages/configuracion/MediaSettings")),
  CategoriesSettings: React.lazy(() => import("../pages/configuracion/categories/CategoriesSettings")),
  TvSettings: React.lazy(() => import("../pages/configuracion/TvSettings")),
  GenresSettings: React.lazy(() => import("../pages/configuracion/press/GenresSettings").then(m => ({ default: m.GenresSettings }))),
  SourcesSettings: React.lazy(() => import("../pages/configuracion/press/SourcesSettings").then(m => ({ default: m.SourcesSettings }))),
  SectionsSettings: React.lazy(() => import("../pages/configuracion/press/SectionsSettings").then(m => ({ default: m.SectionsSettings }))),
  RatesSettings: React.lazy(() => import("../pages/configuracion/press/RatesSettings").then(m => ({ default: m.RatesSettings }))),
  TvTarifasSettings: React.lazy(() => import("../pages/configuracion/tv/TvTarifasSettings").then(m => ({ default: m.TvTarifasSettings }))),
  ParticipantesSettings: React.lazy(() => import("../pages/configuracion/participantes/ParticipantesSettings")),
  ParticipantesGestionSettings: React.lazy(() => import("../pages/configuracion/participantes/ParticipantesGestionSettings").then(m => ({ default: m.ParticipantesGestionSettings }))),
  ParticipantesCategoriasSettings: React.lazy(() => import("../pages/configuracion/participantes/ParticipantesCategoriasSettings").then(m => ({ default: m.ParticipantesCategoriasSettings }))),
  InstitucionesSettings: React.lazy(() => import("../pages/configuracion/instituciones/InstitucionesSettings")),
  InstitucionesGestionSettings: React.lazy(() => import("../pages/configuracion/instituciones/InstitucionesGestionSettings").then(m => ({ default: m.InstitucionesGestionSettings }))),
  InstitucionesCategoriasSettings: React.lazy(() => import("../pages/configuracion/instituciones/InstitucionesCategoriasSettings").then(m => ({ default: m.InstitucionesCategoriasSettings }))),
  InstitucionesAgenciasSettings: React.lazy(() => import("../pages/configuracion/instituciones/InstitucionesAgenciasSettings").then(m => ({ default: m.InstitucionesAgenciasSettings })))
};

// Lazy loaded publiteca pages
export const publitecaRoutes = {
  PublitecaPrensa: React.lazy(() => import("../pages/publiteca/Prensa")),
  PublitecaRadio: React.lazy(() => import("../pages/publiteca/Radio")),
  PublitecaTv: React.lazy(() => import("../pages/publiteca/Tv")),
  PublitecaRedesSociales: React.lazy(() => import("../pages/publiteca/RedesSociales"))
};

export { Index };
