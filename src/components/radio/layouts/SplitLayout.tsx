
import React, { ReactNode } from "react";

interface SplitLayoutProps {
  leftSection: ReactNode;
  rightSection: ReactNode;
  topSection?: ReactNode;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({
  leftSection,
  rightSection,
  topSection
}) => {
  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {topSection && (
        <div className="w-full">
          {topSection}
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        <div className="flex-1 overflow-auto">
          {leftSection}
        </div>
        
        <div className="lg:w-96">
          {rightSection}
        </div>
      </div>
    </div>
  );
};
