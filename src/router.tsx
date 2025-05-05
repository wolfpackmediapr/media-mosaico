
import { createBrowserRouter } from "react-router-dom";
import { routes } from "./routes";

/**
 * Create the router with all routes defined in the routes directory
 * Using createBrowserRouter to support client-side navigation without page refreshes
 */
export const router = createBrowserRouter(routes);
