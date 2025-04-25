import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCheck } from "lucide-react";
import { toast } from "sonner";

interface CopyTextButtonProps {
  text: string;
  isProcessing: boolean;
}

const CopyTextButton = ({ text, isProcessing }: CopyTextButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Texto copiado al portapapeles");
      
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast.error("No se pudo copiar el texto. Intente de nuevo.");
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={handleCopyText}
      disabled={!text || isProcessing}
      className="hover:bg-primary/10 transition-colors"
      aria-label="Copiar texto"
      title="Copiar texto"
    >
      {isCopied ? (
        <CheckCheck className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
};

export default CopyTextButton;
