
import React from "react";
import { Settings } from "lucide-react";

interface NotificationSettingsHeaderProps {
  title: string;
  description: string;
}

const NotificationSettingsHeader = ({
  title,
  description,
}: NotificationSettingsHeaderProps) => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Settings className="h-6 w-6 text-blue-600" />
        {title}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mt-2">
        {description}
      </p>
    </div>
  );
};

export default NotificationSettingsHeader;
