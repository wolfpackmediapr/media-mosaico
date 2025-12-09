import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useContentActivity } from "@/hooks/use-dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2 } from "lucide-react";

export function ContentActivityChart() {
  const { data, isLoading } = useContentActivity();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Actividad de Contenido
          </CardTitle>
          <CardDescription>Últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5" />
          Actividad de Contenido
        </CardTitle>
        <CardDescription>Contenido procesado en los últimos 7 días</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Bar 
              dataKey="prensaDigital" 
              name="Prensa Digital" 
              fill="hsl(var(--chart-1))" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="radio" 
              name="Radio" 
              fill="hsl(var(--chart-2))" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="prensaEscrita" 
              name="Prensa Escrita" 
              fill="hsl(var(--chart-3))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
