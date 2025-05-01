
import React from "react";
import { RouteObject } from "react-router-dom";
import { publitecaRoutes } from "../config/routes";
import { createProtectedRoute } from "./protectedRoutes";

/**
 * Publiteca routes
 */
export const publitecaLayoutRoutes: RouteObject[] = [
  {
    path: "publiteca/prensa",
    element: createProtectedRoute(publitecaRoutes.PublitecaPrensa)
  },
  {
    path: "publiteca/radio",
    element: createProtectedRoute(publitecaRoutes.PublitecaRadio)
  },
  {
    path: "publiteca/tv",
    element: createProtectedRoute(publitecaRoutes.PublitecaTv)
  },
  {
    path: "publiteca/redes-sociales",
    element: createProtectedRoute(publitecaRoutes.PublitecaRedesSociales)
  }
];
