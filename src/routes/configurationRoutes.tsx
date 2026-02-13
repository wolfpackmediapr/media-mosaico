
import React from "react";
import { RouteObject } from "react-router-dom";
import { settingsRoutes } from "../config/routes";
import { createProtectedRoute } from "./protectedRoutes";

/**
 * Settings routes
 */
export const configurationRoutes: RouteObject[] = [
  {
    path: "configuracion/general",
    element: createProtectedRoute(settingsRoutes.GeneralSettings)
  },
  {
    path: "ajustes/general",
    element: createProtectedRoute(settingsRoutes.GeneralSettings, true)
  },
  {
    path: "ajustes/general/medios",
    element: createProtectedRoute(settingsRoutes.MediaSettings, true)
  },
  {
    path: "ajustes/general/categorias",
    element: createProtectedRoute(settingsRoutes.CategoriesSettings, true)
  },
  {
    path: "configuracion/notificaciones",
    element: createProtectedRoute(settingsRoutes.NotificationsSettings, true)
  },
  {
    path: "configuracion/usuarios",
    element: createProtectedRoute(settingsRoutes.UsersSettings, true)
  },
  {
    path: "ajustes/usuarios",
    element: createProtectedRoute(settingsRoutes.UsersSettings, true)
  },
  {
    path: "ajustes/usuarios/administradores",
    element: createProtectedRoute(settingsRoutes.UsersSettings, true)
  },
  {
    path: "ajustes/usuarios/permisos",
    element: createProtectedRoute(settingsRoutes.UsersSettings, true)
  },
  {
    path: "ajustes/clientes",
    element: createProtectedRoute(settingsRoutes.ClientsSettings, true)
  },
  {
    path: "ajustes/prensa",
    element: createProtectedRoute(settingsRoutes.PressSettings, true)
  },
  {
    path: "ajustes/prensa/generos",
    element: createProtectedRoute(settingsRoutes.PressSettings, true)
  },
  {
    path: "ajustes/prensa/fuentes",
    element: createProtectedRoute(settingsRoutes.PressSettings, true)
  },
  {
    path: "ajustes/prensa/secciones",
    element: createProtectedRoute(settingsRoutes.PressSettings, true)
  },
  {
    path: "ajustes/prensa/tarifas",
    element: createProtectedRoute(settingsRoutes.PressSettings, true)
  },
  {
    path: "ajustes/radio",
    element: createProtectedRoute(settingsRoutes.RadioSettings, true)
  },
  {
    path: "ajustes/radio/estaciones",
    element: createProtectedRoute(settingsRoutes.RadioSettings, true)
  },
  {
    path: "ajustes/radio/programas",
    element: createProtectedRoute(settingsRoutes.RadioSettings, true)
  },
  {
    path: "ajustes/radio/tarifas",
    element: createProtectedRoute(settingsRoutes.RadioSettings, true)
  },
  {
    path: "ajustes/tv",
    element: createProtectedRoute(settingsRoutes.TvSettings, true)
  },
  {
    path: "ajustes/tv/canales",
    element: createProtectedRoute(settingsRoutes.TvSettings, true)
  },
  {
    path: "ajustes/tv/programas",
    element: createProtectedRoute(settingsRoutes.TvSettings, true)
  },
  {
    path: "ajustes/tv/tarifas",
    element: createProtectedRoute(settingsRoutes.TvSettings, true)
  },
  {
    path: "ajustes/participantes",
    element: createProtectedRoute(settingsRoutes.ParticipantesSettings, true)
  },
  {
    path: "ajustes/participantes/gestion",
    element: createProtectedRoute(settingsRoutes.ParticipantesSettings, true)
  },
  {
    path: "ajustes/participantes/categorias",
    element: createProtectedRoute(settingsRoutes.ParticipantesSettings, true)
  },
  {
    path: "ajustes/instituciones",
    element: createProtectedRoute(settingsRoutes.InstitucionesSettings, true)
  },
  {
    path: "ajustes/instituciones/gestion",
    element: createProtectedRoute(settingsRoutes.InstitucionesSettings, true)
  },
  {
    path: "ajustes/instituciones/categorias",
    element: createProtectedRoute(settingsRoutes.InstitucionesSettings, true)
  },
  {
    path: "ajustes/instituciones/agencias",
    element: createProtectedRoute(settingsRoutes.InstitucionesSettings, true)
  }
];
