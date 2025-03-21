
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
        className={`mb-1 w-full justify-start px-3 py-2 text-left hover:bg-muted transition-colors rounded-md ${
          isActive ? 'bg-muted font-medium' : ''
        }`}
      >
        <Link to={section.path} className="block w-full">{section.label}</Link>
      </div>
      
      {isActive && section.subsections && (
        <div className="ml-4 mt-1 space-y-1 border-l pl-3">
          {section.subsections.map((subsection) => {
            const isSubActive = currentPath === subsection.path;
            return (
              <Link
                key={subsection.path}
                to={subsection.path}
                className={`block text-sm px-2 py-1 hover:text-primary transition-colors rounded-sm ${
                  isSubActive ? 'text-primary font-medium bg-muted/50' : 'text-muted-foreground'
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
