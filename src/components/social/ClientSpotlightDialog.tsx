import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { ClientSpotlight } from "@/types/social";

interface Props {
  spotlight: ClientSpotlight;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (clientName: string) => void;
}

export const ClientSpotlightDialog = ({ spotlight, open, onOpenChange, onSelect }: Props) => {
  const items = spotlight.allArticles?.length ? spotlight.allArticles : spotlight.articles;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <DialogTitle className="truncate">{spotlight.clientName}</DialogTitle>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {spotlight.matchCount}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {spotlight.category}
            </Badge>
            <DialogDescription className="m-0">
              Menciones detectadas en los últimos 30 días
            </DialogDescription>
          </div>
        </DialogHeader>

        <ul className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 -mr-1">
          {items.map((a) => (
            <li
              key={a.id}
              className="border-l-2 border-primary/30 pl-3 py-2 rounded-sm hover:bg-muted/50 transition-colors"
            >
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium line-clamp-2 hover:underline flex items-start gap-1"
              >
                <span className="flex-1">{a.title}</span>
                <ExternalLink className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
              </a>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
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

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Cerrar
            </Button>
          </DialogClose>
          {onSelect && (
            <Button
              size="sm"
              onClick={() => {
                onSelect(spotlight.clientName);
                onOpenChange(false);
              }}
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Ver en feed
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientSpotlightDialog;