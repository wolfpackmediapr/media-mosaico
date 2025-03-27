
import { Card } from "@/components/ui/card";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SettingsBreadcrumb } from "./SettingsBreadcrumb";
import { SettingsHeader } from "./SettingsHeader";
import { SettingsNav } from "./SettingsNav";

interface SettingsLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;  // Added this line to support the action prop
}

export function SettingsLayout({ children, title, description, action }: SettingsLayoutProps) {
  const location = useLocation();
  
  return (
    <div className="space-y-6 pb-16">
      <SettingsBreadcrumb title={title} />
      <SettingsHeader title={title} description={description} action={action} />
      
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
