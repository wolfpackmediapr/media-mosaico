
import { Link } from "react-router-dom";

interface SettingsNavSectionProps {
  section: {
    label: string;
    path: string;
    subsections?: {
      label: string;
      path: string;
    }[];
  };
  isActive: boolean;
  currentPath: string;
}

export function SettingsNavSection({ 
  section, 
  isActive, 
  currentPath 
}: SettingsNavSectionProps) {
  const sectionValue = section.path.split('/').pop() || '';
  
  return (
    <div key={section.path} className="mb-2">
      <div
        className={`mb-1 w-full justify-start px-3 py-2 text-left hover:bg-muted ${
          isActive ? 'bg-muted font-medium' : ''
        }`}
      >
        <Link to={section.path}>{section.label}</Link>
      </div>
      
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
}
