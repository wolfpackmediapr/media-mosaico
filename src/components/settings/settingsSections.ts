export interface SettingsSubsection {
  label: string;
  path: string;
}

export interface SettingsSection {
  label: string;
  path: string;
  subsections: SettingsSubsection[];
}

export const settingsSections: SettingsSection[] = [
  {
    label: 'General',
    path: '/ajustes/general',
    subsections: [
      { label: 'Medios', path: '/ajustes/general/medios' },
      { label: 'Categorías de Noticias', path: '/ajustes/general/categorias' }
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
      { label: 'Categorías de Clientes', path: '/ajustes/clientes/categorias' },
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
      { label: 'Instituciones', path: '/ajustes/instituciones/gestion' },
      { label: 'Categorías', path: '/ajustes/instituciones/categorias' },
      { label: 'Agencias', path: '/ajustes/instituciones/agencias' }
    ]
  }
];
