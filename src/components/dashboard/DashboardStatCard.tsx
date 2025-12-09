import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardStatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  trend?: number;
  isLoading?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function DashboardStatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  isLoading,
  onClick,
  variant = 'default',
}: DashboardStatCardProps) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return <Minus className="h-3 w-3" />;
    return trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-muted-foreground";
    return trend > 0 ? "text-green-600" : "text-red-600";
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20";
      case 'warning':
        return "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20";
      case 'danger':
        return "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("transition-all", getVariantStyles())}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "transition-all",
        getVariantStyles(),
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend !== undefined && (
            <span className={cn("flex items-center gap-1 text-xs font-medium", getTrendColor())}>
              {getTrendIcon()}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
