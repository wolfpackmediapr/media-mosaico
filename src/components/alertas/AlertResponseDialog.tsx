import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { TypeformAlert } from "@/hooks/use-typeform-alerts";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  alert: TypeformAlert;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const AlertResponseDialog = ({ alert, open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={alert.formType === "tv" ? "default" : "secondary"}>
              {alert.formType === "tv" ? "TV" : "Radio"}
            </Badge>
            {alert.channel && <Badge variant="outline">{alert.channel}</Badge>}
            {alert.category && <Badge variant="outline">{alert.category}</Badge>}
          </div>
          <DialogTitle className="text-lg">{alert.title || "Sin título"}</DialogTitle>
          <DialogDescription>
            {alert.program && <span className="block">{alert.program}</span>}
            <span className="text-xs">
              {format(new Date(alert.submittedAt), "PPPp", { locale: es })}
            </span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4">
            {alert.summary && (
              <section>
                <h4 className="text-sm font-semibold mb-1">Resumen</h4>
                <p className="text-sm whitespace-pre-line text-muted-foreground">{alert.summary}</p>
              </section>
            )}

            {alert.clients.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold mb-1">Clientes</h4>
                <div className="flex flex-wrap gap-1.5">
                  {alert.clients.map((c) => (
                    <Badge key={c} variant="outline" className="border-primary/40 text-primary">
                      {c}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {alert.tags.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold mb-1">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {alert.tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h4 className="text-sm font-semibold mb-1">Respuesta completa</h4>
              <dl className="text-xs space-y-2">
                {Object.entries(alert.rawAnswers).map(([k, v]) => (
                  <div key={k} className="border-b border-border pb-2">
                    <dt className="font-medium text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 whitespace-pre-line">
                      {Array.isArray(v) ? v.join(", ") : v}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AlertResponseDialog;