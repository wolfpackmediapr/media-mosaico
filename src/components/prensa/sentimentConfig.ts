import { Smile, Frown, Meh, HelpCircle, type LucideIcon } from "lucide-react";

export type SentimentKey = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface SentimentConfigEntry {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const sentimentConfig: Record<SentimentKey, SentimentConfigEntry> = {
  positive: { label: 'Positivo', icon: Smile, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  negative: { label: 'Negativo', icon: Frown, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  neutral: { label: 'Neutral', icon: Meh, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  mixed: { label: 'Mixto', icon: HelpCircle, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
};