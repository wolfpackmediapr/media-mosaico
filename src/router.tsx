
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

// Create routes with layout wrapper and suspense fallback
export const router = createBrowserRouter([
  // Authentication routes - without the main layout
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
  },
  // Main application routes with layout
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
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.Radio />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "tv",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.Tv />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "prensa",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.Prensa />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "prensa-escrita",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.PrensaEscrita />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "redes-sociales",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.RedesSociales />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "reportes",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.Reportes />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "notificaciones",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.Notificaciones />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "envio-alertas",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.EnvioAlertas />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "ajustes",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.Ajustes />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "ayuda",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <lazyRoutes.Ayuda />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "media-monitoring",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute adminOnly>
              <lazyRoutes.MediaMonitoring />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "admin",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute adminOnly>
              <lazyRoutes.Admin />
            </ProtectedRoute>
          </Suspense>
        )
      },
      // Settings routes - adding protection to all settings routes
      {
        path: "configuracion/general",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <settingsRoutes.GeneralSettings />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "configuracion/notificaciones",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <settingsRoutes.NotificationsSettings />
            </ProtectedRoute>
          </Suspense>
        )
      },
      // Publiteca routes - adding protection
      {
        path: "publiteca/prensa",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <publitecaRoutes.PublitecaPrensa />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "publiteca/radio",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <publitecaRoutes.PublitecaRadio />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "publiteca/tv",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <publitecaRoutes.PublitecaTv />
            </ProtectedRoute>
          </Suspense>
        )
      },
      {
        path: "publiteca/redes-sociales",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <publitecaRoutes.PublitecaRedesSociales />
            </ProtectedRoute>
          </Suspense>
        )
      }
    ]
  }
]);
