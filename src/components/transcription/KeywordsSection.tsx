
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { toast } from "sonner";

interface KeywordsSectionProps {
  keywords: string[];
}

const KeywordsSection = ({ keywords }: KeywordsSectionProps) => {
  if (!keywords || keywords.length === 0) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Palabra clave copiada al portapapeles");
    } catch (err) {
      toast.error("Error al copiar el texto");
    }
  };

  return (
    <div className="mt-6 space-y-2">
      <h3 className="font-semibold flex items-center gap-2 text-primary-900">
        <Tag className="h-4 w-4" />
        Palabras Clave
      </h3>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="cursor-pointer bg-primary-50 hover:bg-primary-100 text-primary-900 transition-colors"
            onClick={() => copyToClipboard(keyword)}
          >
            {keyword}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default KeywordsSection;
