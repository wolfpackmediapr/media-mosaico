
interface TypeformWidget {
  createWidget: () => any;
  unmount?: () => void;
  microphone?: {
    enabled: boolean;
  };
  audio?: {
    enabled: boolean;
  };
}

declare global {
  interface Window {
    tf?: TypeformWidget;
  }
}

export {};
