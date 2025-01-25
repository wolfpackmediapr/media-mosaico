import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface FiveWAnalysisProps {
  quien?: string;
  que?: string;
  cuando?: string;
  donde?: string;
  porque?: string;
}

const FiveWAnalysis = ({ quien, que, cuando, donde, porque }: FiveWAnalysisProps) => {
  const analysisFields = [
    { label: "¿Quién?", value: quien },
    { label: "¿Qué?", value: que },
    { label: "¿Cuándo?", value: cuando },
    { label: "¿Dónde?", value: donde },
    { label: "¿Por qué?", value: porque },
  ];

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${section} copiado al portapapeles`);
    } catch (err) {
      toast.error("Error al copiar el texto");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {analysisFields.map(({ label, value }) => 
        value ? (
          <div key={label} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{label}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(value, label)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{value}</p>
          </div>
        ) : null
      )}
    </div>
  );
};

export default FiveWAnalysis;