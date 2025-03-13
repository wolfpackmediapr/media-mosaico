
import { useState } from "react";

export const useTabState = (initialTab: string) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  return {
    activeTab,
    setActiveTab
  };
};
