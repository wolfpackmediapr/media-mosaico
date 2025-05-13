
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/lib/react-query";
import { router } from "./router";
import { Toaster } from "./components/ui/sonner";
import { RealTimeAlertsProvider } from "./providers/RealTimeAlertsProvider";
import { AuthProvider } from "@/context/AuthContext";
import ErrorBoundary from "./components/common/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealTimeAlertsProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors closeButton />
          </RealTimeAlertsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
