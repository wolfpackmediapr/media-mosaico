
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ClientEngagementChartProps {
  data: { client: string; openRate: number }[];
}

const ClientEngagementChart: React.FC<ClientEngagementChartProps> = ({ data }) => {
  return (
    <div className="border rounded-md p-4">
      <h4 className="text-sm font-medium mb-4">Engagement por Cliente</h4>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="%" domain={[0, 100]} />
            <YAxis type="category" dataKey="client" />
            <Tooltip formatter={(value) => {
              // Check if value is a number or can be converted to one
              if (typeof value === 'number') {
                return [`${value.toFixed(1)}%`, 'Tasa de Apertura'];
              } else if (typeof value === 'string' && !isNaN(Number(value))) {
                return [`${parseFloat(value).toFixed(1)}%`, 'Tasa de Apertura'];
              }
              // Fallback for any other case
              return [`${value}`, 'Tasa de Apertura'];
            }} />
            <Bar dataKey="openRate" fill="#ffc658" name="Tasa de Apertura" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ClientEngagementChart;
