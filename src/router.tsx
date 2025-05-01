
import React, { Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { lazyRoutes, settingsRoutes, publitecaRoutes, Index } from "./config/routes";
import Layout from "./components/layout/Layout";
import PageLoader from "./components/common/PageLoader";
import { MediaPersistenceProvider } from "@/context/MediaPersistenceContext";
import PublicLayout from "./components/layout/PublicLayout";
import Auth from "./pages/Auth";
import RecuperarPassword from "./pages/RecuperarPassword";
import Registro from "./pages/Registro";
import ProtectedRoute from "./components/auth/ProtectedRoute";

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

// Helper function to create a protected route with suspense
const createProtectedRoute = (Component, adminOnly = false) => (
  <Suspense fallback={<PageLoader />}>
    <ProtectedRoute adminOnly={adminOnly}>
      <Component />
    </ProtectedRoute>
  </Suspense>
);

// Helper function to create a public route with suspense
const createPublicRoute = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Authentication routes (public)
const authRoutes = [
  {
    path: "/auth",
    element: (
      <PublicLayout>
        <Auth />
      </PublicLayout>
    )
  },
  {
    path: "/registro",
    element: (
      <PublicLayout>
        <Registro />
      </PublicLayout>
    )
  },
  {
    path: "/recuperar-password",
    element: (
      <PublicLayout>
        <RecuperarPassword />
      </PublicLayout>
    )
  }
];

// Main application routes that require authentication
const protectedRoutes = [
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

// Admin routes
const adminRoutes = [
  {
    path: "media-monitoring",
    element: createProtectedRoute(lazyRoutes.MediaMonitoring, true)
  },
  {
    path: "admin",
    element: createProtectedRoute(lazyRoutes.Admin, true)
  }
];

// Public routes within the main layout (no authentication required)
const publicLayoutRoutes = [
  {
    path: "radio",
    element: createPublicRoute(lazyRoutes.Radio)
  }
];

// Settings routes
const configurationRoutes = [
  {
    path: "configuracion/general",
    element: createProtectedRoute(settingsRoutes.GeneralSettings)
  },
  {
    path: "configuracion/notificaciones",
    element: createProtectedRoute(settingsRoutes.NotificationsSettings)
  }
];

// Publiteca routes
const publitecaLayoutRoutes = [
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

// Main application routes structure
const mainAppRoutes = {
  path: "/",
  element: <LayoutWithProviders />,
  children: [
    {
      index: true,
      element: <Index />
    },
    ...publicLayoutRoutes,
    ...protectedRoutes,
    ...adminRoutes,
    ...configurationRoutes,
    ...publitecaLayoutRoutes
  ]
};

// Create the router with all routes
export const router = createBrowserRouter([
  ...authRoutes,
  mainAppRoutes
]);
