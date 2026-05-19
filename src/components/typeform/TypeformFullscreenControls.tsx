import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Minimize2, X } from "lucide-react";

interface Props {
  onHide: () => void;
}

/**
 * Floating overlay shown only while a Typeform iframe is in fullscreen.
 * Lets the user exit fullscreen or hide the embed entirely — the parent
 * controls live outside the iframe and would otherwise be inaccessible.
 */
const TypeformFullscreenControls = ({ onHide }: Props) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    typeof document !== 'undefined' && !!document.fullscreenElement,
  );

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (!isFullscreen || typeof document === 'undefined') return null;

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {/* ignore */});
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 2147483647,
        display: 'flex',
        gap: 8,
      }}
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={exitFullscreen}
        title="Salir pantalla completa"
      >
        <Minimize2 className="h-4 w-4 mr-1" />
        Salir
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          exitFullscreen();
          onHide();
        }}
        title="Ocultar formulario"
      >
        <X className="h-4 w-4 mr-1" />
        Ocultar
      </Button>
    </div>,
    document.body,
  );
};

export default TypeformFullscreenControls;