
import React from "react";
import { RouteObject } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import Auth from "../pages/Auth";
import RecuperarPassword from "../pages/RecuperarPassword";
import Registro from "../pages/Registro";

/**
 * Authentication routes (public)
 */
export const authRoutes: RouteObject[] = [
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
