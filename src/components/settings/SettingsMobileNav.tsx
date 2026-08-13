import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsSections } from "./settingsSections";

interface SettingsMobileNavProps {
  currentPath: string;
}

export function SettingsMobileNav({ currentPath }: SettingsMobileNavProps) {
  const navigate = useNavigate();

  const allItems = settingsSections.flatMap((section) =>
    section.subsections.map((sub) => ({ ...sub, section: section.label }))
  );

  const current =
    allItems.find((item) => currentPath.startsWith(item.path))?.path ?? "";

  return (
    <div className="lg:hidden">
      <Select value={current} onValueChange={(value) => navigate(value)}>
        <SelectTrigger className="h-11 w-full" aria-label="Navegación de ajustes">
          <SelectValue placeholder="Selecciona una sección" />
        </SelectTrigger>
        <SelectContent className="max-h-[60vh]">
          {settingsSections.map((section) => (
            <SelectGroup key={section.path}>
              <SelectLabel>{section.label}</SelectLabel>
              {section.subsections.map((sub) => (
                <SelectItem key={sub.path} value={sub.path}>
                  {sub.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
