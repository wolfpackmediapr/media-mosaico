
import React from "react";

interface MonitoringHeaderProps {
  title: string;
  description: string;
}

const MonitoringHeader = ({ title, description }: MonitoringHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
};

export default MonitoringHeader;
