import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2 bg-secondary/30 p-1 rounded-lg">
      <Moon className="h-4 w-4" />
      <Switch
        checked={theme === "light"}
        onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
      />
      <Sun className="h-4 w-4" />
    </div>
  );
}