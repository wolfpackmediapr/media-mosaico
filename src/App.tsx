
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { queryClient } from "@/lib/react-query";
import { router } from "./router";
import { Toaster } from "./components/ui/sonner";
import { RealTimeAlertsProvider } from "./providers/RealTimeAlertsProvider";
import { AuthProvider } from "@/context/AuthContext";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RealTimeAlertsProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors closeButton />
          </RealTimeAlertsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
