
import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";

interface SettingsBreadcrumbProps {
  title: string;
}

export function SettingsBreadcrumb({ title }: SettingsBreadcrumbProps) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <Link to="/" className="text-sm">
            Inicio
          </Link>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <Link to="/ajustes" className="text-sm">
            Ajustes
          </Link>
        </BreadcrumbItem>
        {pathSegments.length > 1 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
