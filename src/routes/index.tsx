
import React from "react";
import { Outlet } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { MediaPersistenceProvider } from "@/context/MediaPersistenceContext";
import { authRoutes } from "./authRoutes";
import { protectedRoutes, adminRoutes } from "./protectedRoutes";
import { publicLayoutRoutes } from "./publicRoutes";
import { configurationRoutes } from "./configurationRoutes";
import { publitecaLayoutRoutes } from "./publitecaRoutes";

// Import directly from the source file instead of from config/routes
import Index from "../pages/Index";

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

// Main application routes structure
export const mainAppRoute = {
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

// All routes combined
export const routes = [
  ...authRoutes,
  mainAppRoute
];
