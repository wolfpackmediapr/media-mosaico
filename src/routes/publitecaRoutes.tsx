
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
    element: createProtectedRoute(publitecaRoutes.PublitecaPrensa, false, "publiteca", {
      anySection: ["prensa", "prensa-escrita"],
    })
  },
  {
    path: "publiteca/radio",
    element: createProtectedRoute(publitecaRoutes.PublitecaRadio, false, "publiteca", {
      sections: ["radio"],
    })
  },
  {
    path: "publiteca/tv",
    element: createProtectedRoute(publitecaRoutes.PublitecaTv, false, "publiteca", {
      sections: ["tv"],
    })
  },
  {
    path: "publiteca/redes-sociales",
    element: createProtectedRoute(publitecaRoutes.PublitecaRedesSociales, false, "publiteca", {
      sections: ["redes-sociales"],
    })
  }
];
