
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
  }
];
