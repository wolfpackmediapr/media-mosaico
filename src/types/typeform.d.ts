
interface TypeformWidget {
  createWidget: () => any;
  unmount?: () => void;
  microphone?: {
    enabled: boolean;
  };
}

declare global {
  interface Window {
    tf?: TypeformWidget;
  }
}

export {};
