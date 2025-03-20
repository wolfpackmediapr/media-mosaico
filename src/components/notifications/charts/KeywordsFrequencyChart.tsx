
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface KeywordsFrequencyChartProps {
  data: { keyword: string; count: number }[];
}

const KeywordsFrequencyChart: React.FC<KeywordsFrequencyChartProps> = ({ data }) => {
  return (
    <div className="border rounded-md p-4">
      <h4 className="text-sm font-medium mb-4">Keywords Más Frecuentes</h4>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="keyword" />
            <Tooltip />
            <Bar dataKey="count" fill="#82ca9d" name="Menciones" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default KeywordsFrequencyChart;
