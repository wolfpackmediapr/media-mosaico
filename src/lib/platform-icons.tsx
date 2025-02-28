
import { Twitter, Facebook, Rss, Instagram, Youtube, Linkedin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Map of platform identifier to icon component
export const platformIcons: Record<string, LucideIcon> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  news: Rss,
  rss: Rss,
  social_media: Twitter // Default for general social media
};
