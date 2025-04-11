
import { ReactNode } from "react";
import { Image } from "@/components/ui/image";

interface PublicLayoutProps {
  children: ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="w-full bg-white border-b border-gray-200 py-4">
        <div className="container flex justify-center">
          <Image
            src="/lovable-uploads/da0f30a7-c379-42a2-95ed-ce8b4c40abd4.png"
            alt="Publimedia"
            className="h-8 w-auto"
          />
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="w-full bg-white border-t border-gray-200 py-4">
        <div className="container flex justify-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Publimedia. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
