import { AlertTriangle } from "lucide-react";

interface AlertsSectionProps {
  alerts: string[];
}

const AlertsSection = ({ alerts }: AlertsSectionProps) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="mt-6 space-y-2">
      <h3 className="font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        Alertas
      </h3>
      <div className="space-y-2">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className="text-sm p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
          >
            {alert}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsSection;