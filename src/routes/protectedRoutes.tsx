
import React, { Suspense } from "react";
import { RouteObject } from "react-router-dom";
import { lazyRoutes } from "../config/routes";
import PageLoader from "../components/common/PageLoader";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import type { SectionKey } from "@/hooks/use-section-permissions";

/**
 * Helper function to create a protected route with suspense
 * Handles both lazy-loaded and directly imported components
 */
export const createProtectedRoute = (
  Component: React.LazyExoticComponent<() => JSX.Element> | React.ComponentType<any>, 
  adminOnly = false,
  section?: SectionKey
) => {
  // Direct component (function) - no suspense needed
  if (typeof Component === 'function') {
    const DirectComponent = Component as React.ComponentType<any>;
    return (
      <ProtectedRoute adminOnly={adminOnly} section={section}>
        <DirectComponent />
      </ProtectedRoute>
    );
  }
  
  // Lazy component (object) - wrap with suspense
  const LazyComponent = Component as React.LazyExoticComponent<() => JSX.Element>;
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute adminOnly={adminOnly} section={section}>
        <LazyComponent />
      </ProtectedRoute>
    </Suspense>
  );
};

/**
 * Main application routes that require authentication
 */
export const protectedRoutes: RouteObject[] = [
  {
    path: "radio",
    element: createProtectedRoute(lazyRoutes.Radio, false, "radio")
  },
  {
    path: "tv",
    element: createProtectedRoute(lazyRoutes.Tv, false, "tv")
  },
  {
    path: "prensa",
    element: createProtectedRoute(lazyRoutes.Prensa, false, "prensa")
  },
  {
    path: "prensa-escrita",
    element: createProtectedRoute(lazyRoutes.PrensaEscrita, false, "prensa-escrita")
  },
  {
    path: "redes-sociales",
    element: createProtectedRoute(lazyRoutes.RedesSociales, false, "redes-sociales")
  },
  {
    path: "reportes",
    element: createProtectedRoute(lazyRoutes.Reportes, false, "reportes")
  },
  {
    path: "notificaciones",
    element: createProtectedRoute(lazyRoutes.Notificaciones, false, "notificaciones")
  },
  {
    path: "envio-alertas",
    element: createProtectedRoute(lazyRoutes.EnvioAlertas, false, "envio-alertas")
  },
  {
    path: "ajustes",
    element: createProtectedRoute(lazyRoutes.Ajustes, true)
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
