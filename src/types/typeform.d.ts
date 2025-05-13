
/**
 * Global TypeScript declaration for Typeform APIs
 */

interface TypeformDomain {
  currentDomain: string;
  primaryDomain: string;
}

interface TypeformWidget {
  refresh: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  unmount: () => void;
}

interface TypeformAPI {
  createWidget: (params: any) => TypeformWidget;
  domain?: TypeformDomain;
}

declare global {
  interface Window {
    tf: TypeformAPI;
  }
}

export {};
