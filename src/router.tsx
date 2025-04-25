
import React, { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { lazyRoutes, settingsRoutes, publitecaRoutes, Index } from "./config/routes";
import Layout from "./components/layout/Layout";
import PageLoader from "./components/common/PageLoader";

// Create routes with layout wrapper and suspense fallback
export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Index />
      },
      {
        path: "radio",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.Radio />
          </Suspense>
        )
      },
      {
        path: "tv",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.Tv />
          </Suspense>
        )
      },
      {
        path: "prensa",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.Prensa />
          </Suspense>
        )
      },
      {
        path: "prensa-escrita",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.PrensaEscrita />
          </Suspense>
        )
      },
      {
        path: "redes-sociales",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.RedesSociales />
          </Suspense>
        )
      },
      {
        path: "reportes",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.Reportes />
          </Suspense>
        )
      },
      {
        path: "notificaciones",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.Notificaciones />
          </Suspense>
        )
      },
      {
        path: "envio-alertas",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.EnvioAlertas />
          </Suspense>
        )
      },
      {
        path: "ajustes",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.Ajustes />
          </Suspense>
        )
      },
      {
        path: "ayuda",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.Ayuda />
          </Suspense>
        )
      },
      {
        path: "media-monitoring",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.MediaMonitoring />
          </Suspense>
        )
      },
      {
        path: "admin",
        element: (
          <Suspense fallback={<PageLoader />}>
            <lazyRoutes.Admin />
          </Suspense>
        )
      },
      // Settings routes
      {
        path: "configuracion/general",
        element: (
          <Suspense fallback={<PageLoader />}>
            <settingsRoutes.GeneralSettings />
          </Suspense>
        )
      },
      {
        path: "configuracion/notificaciones",
        element: (
          <Suspense fallback={<PageLoader />}>
            <settingsRoutes.NotificationsSettings />
          </Suspense>
        )
      },
      // Publiteca routes
      {
        path: "publiteca/prensa",
        element: (
          <Suspense fallback={<PageLoader />}>
            <publitecaRoutes.PublitecaPrensa />
          </Suspense>
        )
      },
      {
        path: "publiteca/radio",
        element: (
          <Suspense fallback={<PageLoader />}>
            <publitecaRoutes.PublitecaRadio />
          </Suspense>
        )
      },
      {
        path: "publiteca/tv",
        element: (
          <Suspense fallback={<PageLoader />}>
            <publitecaRoutes.PublitecaTv />
          </Suspense>
        )
      },
      {
        path: "publiteca/redes-sociales",
        element: (
          <Suspense fallback={<PageLoader />}>
            <publitecaRoutes.PublitecaRedesSociales />
          </Suspense>
        )
      }
    ]
  }
]);
