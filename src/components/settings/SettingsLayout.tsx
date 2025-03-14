
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface SettingsLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function SettingsLayout({ children, title, description }: SettingsLayoutProps) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // Get the current section (the last part of the path)
  const currentSection = pathSegments[pathSegments.length - 1];

  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-0.5">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} to="/">
                Inicio
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} to="/ajustes">
                Ajustes
              </BreadcrumbLink>
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

        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-8 lg:space-y-0">
        <aside className="lg:w-1/5">
          <SettingsNav currentPath={location.pathname} />
        </aside>
        <div className="flex-1 lg:max-w-4xl">
          <Card className="overflow-hidden">
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
}

function SettingsNav({ currentPath }: { currentPath: string }) {
  const sections = [
    { 
      label: 'General',
      path: '/ajustes/general',
      subsections: [
        { label: 'Medios', path: '/ajustes/general/medios' },
        { label: 'Categorías', path: '/ajustes/general/categorias' }
      ]
    },
    { 
      label: 'Usuarios',
      path: '/ajustes/usuarios',
      subsections: [
        { label: 'Administradores', path: '/ajustes/usuarios/administradores' },
        { label: 'Permisos', path: '/ajustes/usuarios/permisos' }
      ]
    },
    { 
      label: 'Clientes',
      path: '/ajustes/clientes',
      subsections: [
        { label: 'Gestión', path: '/ajustes/clientes/gestion' },
        { label: 'Permisos', path: '/ajustes/clientes/permisos' }
      ]
    },
    { 
      label: 'Prensa',
      path: '/ajustes/prensa',
      subsections: [
        { label: 'Géneros', path: '/ajustes/prensa/generos' },
        { label: 'Fuentes', path: '/ajustes/prensa/fuentes' },
        { label: 'Secciones', path: '/ajustes/prensa/secciones' },
        { label: 'Tarifas', path: '/ajustes/prensa/tarifas' }
      ]
    },
    { 
      label: 'Radio',
      path: '/ajustes/radio',
      subsections: [
        { label: 'Programas', path: '/ajustes/radio/programas' },
        { label: 'Tarifas', path: '/ajustes/radio/tarifas' }
      ]
    },
    { 
      label: 'TV',
      path: '/ajustes/tv',
      subsections: [
        { label: 'Programas', path: '/ajustes/tv/programas' },
        { label: 'Tarifas', path: '/ajustes/tv/tarifas' }
      ]
    },
    { 
      label: 'Participantes',
      path: '/ajustes/participantes',
      subsections: [
        { label: 'Gestión', path: '/ajustes/participantes/gestion' },
        { label: 'Categorías', path: '/ajustes/participantes/categorias' }
      ]
    },
    { 
      label: 'Instituciones',
      path: '/ajustes/instituciones',
      subsections: [
        { label: 'Gestión', path: '/ajustes/instituciones/gestion' },
        { label: 'Categorías', path: '/ajustes/instituciones/categorias' },
        { label: 'Agencias', path: '/ajustes/instituciones/agencias' }
      ]
    }
  ];

  return (
    <Tabs className="w-full" orientation="vertical" defaultValue="general">
      <TabsList className="flex h-auto w-full flex-col items-stretch justify-start bg-transparent p-0">
        {sections.map((section) => {
          const isActive = currentPath.includes(section.path);
          const isActiveExact = currentPath === section.path;
          
          return (
            <div key={section.path} className="mb-2">
              <TabsTrigger
                value={section.path.split('/').pop() || ''}
                className={`mb-1 w-full justify-start px-3 py-2 text-left hover:bg-muted ${
                  isActive ? 'bg-muted font-medium' : ''
                }`}
                asChild
              >
                <Link to={section.path}>{section.label}</Link>
              </TabsTrigger>
              
              {isActive && section.subsections && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                  {section.subsections.map((subsection) => {
                    const isSubActive = currentPath === subsection.path;
                    return (
                      <Link
                        key={subsection.path}
                        to={subsection.path}
                        className={`block text-sm px-2 py-1 hover:text-primary ${
                          isSubActive ? 'text-primary font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {subsection.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
