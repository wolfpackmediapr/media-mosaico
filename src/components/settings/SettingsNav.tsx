
import { Tabs, TabsList } from "@/components/ui/tabs";
import { SettingsNavSection } from "./SettingsNavSection";
import { settingsSections } from "./settingsSections";

interface SettingsNavProps {
  currentPath: string;
}

export function SettingsNav({ currentPath }: SettingsNavProps) {
  const sections = settingsSections;

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
