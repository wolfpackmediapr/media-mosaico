import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useCategoryBreakdown } from "@/hooks/use-dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  'GOBIERNO': 'hsl(var(--chart-1))',
  'POLÍTICA': 'hsl(var(--chart-2))',
  'ECONOMÍA & NEGOCIOS': 'hsl(var(--chart-3))',
  'CRIMEN': 'hsl(var(--chart-4))',
  'DEPORTES': 'hsl(var(--chart-5))',
  'SALUD': 'hsl(210, 70%, 50%)',
  'EDUCACIÓN & CULTURA': 'hsl(280, 70%, 50%)',
  'COMUNIDAD': 'hsl(160, 70%, 45%)',
  'AMBIENTE & EL TIEMPO': 'hsl(120, 60%, 45%)',
  'OTRAS': 'hsl(0, 0%, 50%)',
};

export function CategoryBreakdownWidget() {
  const { data, isLoading } = useCategoryBreakdown();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Desglose por Categoría
          </CardTitle>
          <CardDescription>Top 10 categorías</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const getColor = (category: string) => {
    return CATEGORY_COLORS[category] || 'hsl(var(--chart-1))';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Desglose por Categoría
        </CardTitle>
        <CardDescription>Distribución de contenido por categoría</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="category" 
              tick={{ fontSize: 11 }}
              width={95}
            />
            <Tooltip 
              formatter={(value: number) => [value.toLocaleString(), 'Artículos']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.category)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
