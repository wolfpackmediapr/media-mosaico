
import React, { Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { lazyRoutes, settingsRoutes, publitecaRoutes, Index } from "./config/routes";
import Layout from "./components/layout/Layout";
import PageLoader from "./components/common/PageLoader";
import { MediaPersistenceProvider } from "@/context/MediaPersistenceContext";
import EnhancedErrorBoundary from "@/components/common/EnhancedErrorBoundary";

// Create a wrapper component that includes MediaPersistenceProvider
const LayoutWithProviders = () => {
  return (
    <Layout>
      <MediaPersistenceProvider>
        <Outlet />
      </MediaPersistenceProvider>
    </Layout>
  );
};

// Helper function to create route elements with error handling
const createRouteElement = (Component, routeName) => (
  <EnhancedErrorBoundary routeSpecific={true} componentName={routeName}>
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  </EnhancedErrorBoundary>
);

// Create routes with layout wrapper and suspense fallback
export const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutWithProviders />,
    children: [
      {
        index: true,
        element: <Index />
      },
      {
        path: "radio",
        element: createRouteElement(lazyRoutes.Radio, "Radio")
      },
      {
        path: "tv",
        element: createRouteElement(lazyRoutes.Tv, "Tv")
      },
      {
        path: "prensa",
        element: createRouteElement(lazyRoutes.Prensa, "Prensa")
      },
      {
        path: "prensa-escrita",
        element: createRouteElement(lazyRoutes.PrensaEscrita, "PrensaEscrita")
      },
      {
        path: "redes-sociales",
        element: createRouteElement(lazyRoutes.RedesSociales, "RedesSociales")
      },
      {
        path: "reportes",
        element: createRouteElement(lazyRoutes.Reportes, "Reportes")
      },
      {
        path: "notificaciones",
        element: createRouteElement(lazyRoutes.Notificaciones, "Notificaciones")
      },
      {
        path: "envio-alertas",
        element: createRouteElement(lazyRoutes.EnvioAlertas, "EnvioAlertas")
      },
      {
        path: "ajustes",
        element: createRouteElement(lazyRoutes.Ajustes, "Ajustes")
      },
      {
        path: "ayuda",
        element: createRouteElement(lazyRoutes.Ayuda, "Ayuda")
      },
      {
        path: "media-monitoring",
        element: createRouteElement(lazyRoutes.MediaMonitoring, "MediaMonitoring")
      },
      {
        path: "admin",
        element: createRouteElement(lazyRoutes.Admin, "Admin")
      },
      // Settings routes
      {
        path: "configuracion/general",
        element: createRouteElement(settingsRoutes.GeneralSettings, "GeneralSettings")
      },
      {
        path: "configuracion/notificaciones",
        element: createRouteElement(settingsRoutes.NotificationsSettings, "NotificationsSettings")
      },
      // Publiteca routes
      {
        path: "publiteca/prensa",
        element: createRouteElement(publitecaRoutes.PublitecaPrensa, "PublitecaPrensa")
      },
      {
        path: "publiteca/radio",
        element: createRouteElement(publitecaRoutes.PublitecaRadio, "PublitecaRadio")
      },
      {
        path: "publiteca/tv",
        element: createRouteElement(publitecaRoutes.PublitecaTv, "PublitecaTv")
      },
      {
        path: "publiteca/redes-sociales",
        element: createRouteElement(publitecaRoutes.PublitecaRedesSociales, "PublitecaRedesSociales")
      }
    ]
  }
]);
