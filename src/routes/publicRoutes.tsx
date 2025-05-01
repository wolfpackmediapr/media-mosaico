
import React, { Suspense } from "react";
import { RouteObject } from "react-router-dom";
import { lazyRoutes } from "../config/routes";
import PageLoader from "../components/common/PageLoader";

/**
 * Helper function to create a public route with suspense
 */
export const createPublicRoute = (Component: React.LazyExoticComponent<() => JSX.Element>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

/**
 * Public routes that don't require authentication
 */
export const publicLayoutRoutes: RouteObject[] = [
  {
    path: "radio",
    element: createPublicRoute(lazyRoutes.Radio)
  }
];
