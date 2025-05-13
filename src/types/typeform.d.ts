
interface TypeformWidget {
  createWidget: () => void;
  // Add domain property which may be undefined
  domain?: {
    currentDomain?: string;
    primaryDomain?: string;
  };
  // Add potential _instances property for cleaning up
  _instances?: Record<string, any>;
}

declare global {
  interface Window {
    tf?: TypeformWidget;
  }
}

export {};
