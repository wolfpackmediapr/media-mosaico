import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sentimentConfig, type SentimentKey } from "./sentimentConfig";

interface SentimentBadgeProps {
  sentiment?: string | null;
  score?: number;
  className?: string;
}

const SentimentBadge = ({ sentiment, score, className }: SentimentBadgeProps) => {
  if (!sentiment) return null;
  const key = sentiment as SentimentKey;
  const config = sentimentConfig[key];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={cn("text-xs flex items-center gap-1", config.bgColor, className)}
    >
      <Icon className={cn("w-3 h-3", config.color)} />
      <span>{config.label}</span>
      {typeof score === 'number' && (
        <span className="text-muted-foreground ml-0.5">{Math.round(score * 100)}%</span>
      )}
    </Badge>
  );
};

export default SentimentBadge;