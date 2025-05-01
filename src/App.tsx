
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { queryClient } from "./lib/react-query";
import { router } from "./router";
import { Toaster } from "./components/ui/sonner";
import { RealTimeAlertsProvider } from "./providers/RealTimeAlertsProvider";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RealTimeAlertsProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors closeButton />
        </RealTimeAlertsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
