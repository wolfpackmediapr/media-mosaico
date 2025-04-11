
interface TypeformWidget {
  createWidget: () => void;
}

declare global {
  interface Window {
    tf?: TypeformWidget;
  }
}

export {};
