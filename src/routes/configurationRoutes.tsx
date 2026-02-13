
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
    element: createProtectedRoute(settingsRoutes.GeneralSettings)
  },
  {
    path: "ajustes/general/medios",
    element: createProtectedRoute(settingsRoutes.MediaSettings)
  },
  {
    path: "ajustes/general/categorias",
    element: createProtectedRoute(settingsRoutes.CategoriesSettings)
  },
  {
    path: "configuracion/notificaciones",
    element: createProtectedRoute(settingsRoutes.NotificationsSettings)
  },
  {
    path: "configuracion/usuarios",
    element: createProtectedRoute(settingsRoutes.UsersSettings)
  },
  {
    path: "ajustes/usuarios",
    element: createProtectedRoute(settingsRoutes.UsersSettings)
  },
  {
    path: "ajustes/usuarios/administradores",
    element: createProtectedRoute(settingsRoutes.UsersSettings)
  },
  {
    path: "ajustes/usuarios/permisos",
    element: createProtectedRoute(settingsRoutes.UsersSettings)
  },
  {
    path: "ajustes/clientes",
    element: createProtectedRoute(settingsRoutes.ClientsSettings)
  },
  {
    path: "ajustes/prensa",
    element: createProtectedRoute(settingsRoutes.PressSettings)
  },
  {
    path: "ajustes/prensa/generos",
    element: createProtectedRoute(settingsRoutes.PressSettings)
  },
  {
    path: "ajustes/prensa/fuentes",
    element: createProtectedRoute(settingsRoutes.PressSettings)
  },
  {
    path: "ajustes/prensa/secciones",
    element: createProtectedRoute(settingsRoutes.PressSettings)
  },
  {
    path: "ajustes/prensa/tarifas",
    element: createProtectedRoute(settingsRoutes.PressSettings)
  },
  {
    path: "ajustes/radio",
    element: createProtectedRoute(settingsRoutes.RadioSettings)
  },
  {
    path: "ajustes/radio/estaciones",
    element: createProtectedRoute(settingsRoutes.RadioSettings)
  },
  {
    path: "ajustes/radio/programas",
    element: createProtectedRoute(settingsRoutes.RadioSettings)
  },
  {
    path: "ajustes/radio/tarifas",
    element: createProtectedRoute(settingsRoutes.RadioSettings)
  },
  {
    path: "ajustes/tv",
    element: createProtectedRoute(settingsRoutes.TvSettings)
  },
  {
    path: "ajustes/tv/canales",
    element: createProtectedRoute(settingsRoutes.TvSettings)
  },
  {
    path: "ajustes/tv/programas",
    element: createProtectedRoute(settingsRoutes.TvSettings)
  },
  {
    path: "ajustes/tv/tarifas",
    element: createProtectedRoute(settingsRoutes.TvSettings)
  },
  {
    path: "ajustes/participantes",
    element: createProtectedRoute(settingsRoutes.ParticipantesSettings)
  },
  {
    path: "ajustes/participantes/gestion",
    element: createProtectedRoute(settingsRoutes.ParticipantesSettings)
  },
  {
    path: "ajustes/participantes/categorias",
    element: createProtectedRoute(settingsRoutes.ParticipantesSettings)
  },
  {
    path: "ajustes/instituciones",
    element: createProtectedRoute(settingsRoutes.InstitucionesSettings)
  },
  {
    path: "ajustes/instituciones/gestion",
    element: createProtectedRoute(settingsRoutes.InstitucionesSettings)
  },
  {
    path: "ajustes/instituciones/categorias",
    element: createProtectedRoute(settingsRoutes.InstitucionesSettings)
  },
  {
    path: "ajustes/instituciones/agencias",
    element: createProtectedRoute(settingsRoutes.InstitucionesSettings)
  }
];
