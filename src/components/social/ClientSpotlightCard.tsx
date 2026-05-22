import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { ClientSpotlight } from "@/types/social";

interface Props {
  spotlight: ClientSpotlight;
  onSelect?: (clientName: string) => void;
}

export const ClientSpotlightCard = ({ spotlight, onSelect }: Props) => {
  return (
    <Card
      className="min-w-[320px] max-w-[360px] flex-shrink-0 flex flex-col h-full hover:border-primary/50 transition-colors"
      aria-label={`Menciones de ${spotlight.clientName}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <CardTitle className="text-base truncate">{spotlight.clientName}</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {spotlight.matchCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {spotlight.category}
          </Badge>
          <span className="text-xs text-muted-foreground">menciones (30d)</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-2 pb-3">
        <ul className="space-y-2">
          {spotlight.articles.map((a) => (
            <li key={a.id} className="border-l-2 border-primary/30 pl-2">
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium line-clamp-2 hover:underline"
              >
                {a.title}
              </a>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                <span className="truncate mr-2">{a.platform_display_name || a.source}</span>
                <span className="shrink-0">
                  {a.pub_date
                    ? formatDistanceToNow(new Date(a.pub_date), { addSuffix: true, locale: es })
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {onSelect && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-auto self-start text-xs"
            onClick={() => onSelect(spotlight.clientName)}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Ver todas
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientSpotlightCard;