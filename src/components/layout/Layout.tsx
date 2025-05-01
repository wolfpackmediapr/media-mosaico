
import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import EnhancedErrorBoundary from "../common/EnhancedErrorBoundary";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  console.log('[Layout] Rendering Layout component');
  
  return (
    <EnhancedErrorBoundary componentName="Layout" routeSpecific={false}>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900 w-full">
        <EnhancedErrorBoundary componentName="Sidebar">
          <Sidebar />
        </EnhancedErrorBoundary>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <EnhancedErrorBoundary componentName="Header">
            <Header />
          </EnhancedErrorBoundary>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="w-full h-full">
              <EnhancedErrorBoundary componentName="Main Content">
                {children}
              </EnhancedErrorBoundary>
            </div>
          </main>
          <EnhancedErrorBoundary componentName="Footer">
            <Footer />
          </EnhancedErrorBoundary>
        </div>
      </div>
    </EnhancedErrorBoundary>
  );
};

export default Layout;
