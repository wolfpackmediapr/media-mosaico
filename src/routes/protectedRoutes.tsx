
import React, { Suspense } from "react";
import { RouteObject } from "react-router-dom";
import { lazyRoutes } from "../config/routes";
import PageLoader from "../components/common/PageLoader";
import ProtectedRoute from "../components/auth/ProtectedRoute";

/**
 * Helper function to create a protected route with suspense
 */
export const createProtectedRoute = (Component: React.LazyExoticComponent<() => JSX.Element>, adminOnly = false) => (
  <Suspense fallback={<PageLoader />}>
    <ProtectedRoute adminOnly={adminOnly}>
      <Component />
    </ProtectedRoute>
  </Suspense>
);

/**
 * Main application routes that require authentication
 */
export const protectedRoutes: RouteObject[] = [
  {
    path: "tv",
    element: createProtectedRoute(lazyRoutes.Tv)
  },
  {
    path: "prensa",
    element: createProtectedRoute(lazyRoutes.Prensa)
  },
  {
    path: "prensa-escrita",
    element: createProtectedRoute(lazyRoutes.PrensaEscrita)
  },
  {
    path: "redes-sociales",
    element: createProtectedRoute(lazyRoutes.RedesSociales)
  },
  {
    path: "reportes",
    element: createProtectedRoute(lazyRoutes.Reportes)
  },
  {
    path: "notificaciones",
    element: createProtectedRoute(lazyRoutes.Notificaciones)
  },
  {
    path: "envio-alertas",
    element: createProtectedRoute(lazyRoutes.EnvioAlertas)
  },
  {
    path: "ajustes",
    element: createProtectedRoute(lazyRoutes.Ajustes)
  },
  {
    path: "ayuda",
    element: createProtectedRoute(lazyRoutes.Ayuda)
  }
];

/**
 * Routes that require administrator privileges
 */
export const adminRoutes: RouteObject[] = [
  {
    path: "media-monitoring",
    element: createProtectedRoute(lazyRoutes.MediaMonitoring, true)
  },
  {
    path: "admin",
    element: createProtectedRoute(lazyRoutes.Admin, true)
  }
];
