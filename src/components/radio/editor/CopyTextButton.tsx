
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CopyTextButtonProps {
  text: string;
  isProcessing: boolean;
}

const CopyTextButton = ({ text, isProcessing }: CopyTextButtonProps) => {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast({
        title: "Texto copiado",
        description: "El texto ha sido copiado al portapapeles",
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el texto. Intente de nuevo.",
        variant: "destructive",
      });
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
