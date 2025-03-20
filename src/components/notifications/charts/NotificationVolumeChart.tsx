
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface NotificationVolumeChartProps {
  data: { date: string; count: number }[];
}

const NotificationVolumeChart: React.FC<NotificationVolumeChartProps> = ({ data }) => {
  return (
    <div className="border rounded-md p-4">
      <h4 className="text-sm font-medium mb-4">Volumen de Notificaciones (30 días)</h4>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" name="Notificaciones" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NotificationVolumeChart;
