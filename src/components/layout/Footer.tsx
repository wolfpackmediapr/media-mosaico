import { Image } from "@/components/ui/image";

const Footer = () => {
  return (
    <footer className="w-full border-t border-gray-200 bg-white py-4">
      <div className="container flex flex-col items-center justify-center space-y-2">
        <Image
          src="/lovable-uploads/da0f30a7-c379-42a2-95ed-ce8b4c40abd4.png"
          alt="Publimedia"
          className="h-6 w-auto"
        />
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} Publimedia. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;