import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tv, Radio, ExternalLink, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { TypeformAlert } from "@/hooks/use-typeform-alerts";
import { AlertResponseDialog } from "./AlertResponseDialog";

interface Props {
  alert: TypeformAlert;
}

export const AlertResponseCard = ({ alert }: Props) => {
  const [open, setOpen] = useState(false);
  const isTv = alert.formType === "tv";
  const Icon = isTv ? Tv : Radio;
  const visibleClients = alert.clients.slice(0, 3);
  const extraClients = Math.max(0, alert.clients.length - visibleClients.length);

  return (
    <>
      <Card className="flex flex-col h-full hover:border-primary/50 transition-colors">
        <CardHeader className="pb-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <Badge variant={isTv ? "default" : "secondary"} className="text-xs">
                {isTv ? "TV" : "Radio"}
              </Badge>
              {alert.channel && (
                <span className="text-xs text-muted-foreground truncate">{alert.channel}</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(alert.submittedAt), { addSuffix: true, locale: es })}
            </span>
          </div>
          {alert.program && (
            <p className="text-xs text-muted-foreground line-clamp-1">{alert.program}</p>
          )}
          <h3 className="font-semibold text-sm leading-snug line-clamp-2">
            {alert.title || "Sin título"}
          </h3>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 flex-1 pb-3">
          {alert.summary && (
            <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">
              {alert.summary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2">
            {alert.category && (
              <Badge variant="outline" className="text-xs">
                {alert.category}
              </Badge>
            )}
            {visibleClients.map((c) => (
              <Badge key={c} variant="outline" className="text-xs border-primary/40 text-primary">
                {c}
              </Badge>
            ))}
            {extraClients > 0 && (
              <Badge variant="outline" className="text-xs">
                +{extraClients}
              </Badge>
            )}
          </div>

          {alert.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              {alert.tags.slice(0, 4).map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-muted">
                  {t}
                </span>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="self-start text-xs h-7 px-2"
            onClick={() => setOpen(true)}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Ver detalle
          </Button>
        </CardContent>
      </Card>
      <AlertResponseDialog alert={alert} open={open} onOpenChange={setOpen} />
    </>
  );
};

export default AlertResponseCard;