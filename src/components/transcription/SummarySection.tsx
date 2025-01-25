import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface SummarySectionProps {
  summary: string;
}

const SummarySection = ({ summary }: SummarySectionProps) => {
  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${section} copiado al portapapeles`);
    } catch (err) {
      toast.error("Error al copiar el texto");
    }
  };

  return (
    <div className="mt-6 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Resumen</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(summary, "Resumen")}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{summary}</p>
    </div>
  );
};

export default SummarySection;