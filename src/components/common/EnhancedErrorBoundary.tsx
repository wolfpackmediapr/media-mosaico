
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  routeSpecific?: boolean;
  componentName?: string;
}

class EnhancedErrorBoundary extends React.Component<EnhancedErrorBoundaryProps, { 
  hasError: boolean; 
  error: Error | null;
  componentStack: string | null;
}> {
  state = { 
    hasError: false, 
    error: null,
    componentStack: null
  };
  
  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to an error reporting service
    console.error(`Error in ${this.props.componentName || 'component'}:`, error);
    console.error("Component stack:", errorInfo.componentStack);
    
    this.setState({
      componentStack: errorInfo.componentStack
    });
  }
  
  handleRefresh = () => {
    if (this.props.routeSpecific) {
      // For route-specific errors, refresh just the current page
      window.location.reload();
    } else {
      // For component errors, just reset the error state to try again
      this.setState({ hasError: false, error: null, componentStack: null });
    }
  };
  
  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center space-y-4 rounded-lg border border-red-100 bg-white p-6 shadow-sm">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-800">Ha ocurrido un error</h2>
            <p className="text-gray-600">
              {this.props.routeSpecific 
                ? "No se pudo cargar esta página correctamente." 
                : "No se pudo cargar este componente."}
            </p>
            {this.state.error && (
              <div className="w-full max-w-md overflow-hidden rounded border border-red-100 bg-red-50 p-2 text-left">
                <p className="text-sm font-medium text-red-800">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <Button 
              onClick={this.handleRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {this.props.routeSpecific ? "Recargar página" : "Reintentar"}
            </Button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
