
import { Twitter, Facebook, Rss } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Map of platform identifier to icon component
export const platformIcons: Record<string, LucideIcon> = {
  twitter: Twitter,
  facebook: Facebook,
  news: Rss,
  rss: Rss
};
