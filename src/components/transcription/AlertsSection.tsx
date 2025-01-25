import { AlertTriangle } from "lucide-react";

interface AlertsSectionProps {
  alerts: string[];
}

const AlertsSection = ({ alerts }: AlertsSectionProps) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="mt-6 space-y-2">
      <h3 className="font-semibold flex items-center gap-2 text-primary-900">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        Alertas
      </h3>
      <div className="space-y-2">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className="text-sm p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-100 dark:border-yellow-800"
          >
            {alert}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsSection;