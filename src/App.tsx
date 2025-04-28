
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";  // Use our custom Toaster component
import { AuthProvider } from "@/context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client with updated configurations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <RouterProvider router={router} />
          <Toaster /> {/* Use our custom Toaster with defaults */}
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
