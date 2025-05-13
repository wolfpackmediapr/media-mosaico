
import { Sun } from "lucide-react";

export function ThemeToggle() {
  return (
    <div className="flex items-center space-x-2 bg-secondary/30 p-1 rounded-lg">
      <Sun className="h-4 w-4" />
      <span className="text-xs">Light Mode</span>
    </div>
  );
}
