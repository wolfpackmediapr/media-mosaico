
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NeedsAuthPlaceholderProps {
  message: string;
  onClose?: () => void;
}

const NeedsAuthPlaceholder: React.FC<NeedsAuthPlaceholderProps> = ({
  message,
  onClose
}) => {
  return (
    <Alert className="relative">
      {onClose && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 h-6 w-6" 
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <LogIn className="h-4 w-4" />
      <AlertTitle>Acceso limitado</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  );
};

export default NeedsAuthPlaceholder;
