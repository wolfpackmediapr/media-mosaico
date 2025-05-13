
interface TypeformWidget {
  createWidget: () => void;
  // Add domain property which may be undefined
  domain?: {
    currentDomain?: string;
    primaryDomain?: string;
  };
  // Add potential _instances property for cleaning up
  _instances?: Record<string, any>;
  // Add options method that may exist on created widgets
  options?: (options: {
    disableKeyboardShortcuts?: boolean;
    disableAutoFocus?: boolean;
    enableSandbox?: boolean;
    disableMicrophone?: boolean;
    disableTracking?: boolean;
  }) => void;
}

// Widget instance returned by createWidget()
interface TypeformWidgetInstance {
  options?: (options: {
    disableKeyboardShortcuts?: boolean;
    disableAutoFocus?: boolean;
    enableSandbox?: boolean;
    disableMicrophone?: boolean;
    disableTracking?: boolean;
  }) => void;
  cleanup?: () => void;
}

declare global {
  interface Window {
    tf?: TypeformWidget;
  }
}

export {};
