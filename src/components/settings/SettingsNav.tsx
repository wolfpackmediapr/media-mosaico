
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsNavSection } from "./SettingsNavSection";

interface SettingsNavProps {
  currentPath: string;
}

export function SettingsNav({ currentPath }: SettingsNavProps) {
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
        { label: 'Canales', path: '/ajustes/tv/canales' },
        { label: 'Programas', path: '/ajustes/tv/programas' }
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
          // Check if this section is active based on the URL path
          const isActive = currentPath.includes(section.path);
          
          return (
            <SettingsNavSection 
              key={section.path}
              section={section}
              isActive={isActive}
              currentPath={currentPath}
            />
          );
        })}
      </TabsList>
    </Tabs>
  );
}
