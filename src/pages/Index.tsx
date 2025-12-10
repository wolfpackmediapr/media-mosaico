import React from "react";
import { Newspaper, Radio, FileText, Rss, Users, Bell, Monitor } from "lucide-react";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import {
  DashboardStatCard,
  ContentActivityChart,
  SourceDistributionWidget,
  CategoryBreakdownWidget,
  FeedHealthWidget,
  RecentActivityTimeline,
  ClientKeywordsWidget,
  QuickActions,
  DateRangeFilter,
} from "@/components/dashboard";
import NotificationFeed from "@/components/notifications/NotificationFeed";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardDateProvider } from "@/contexts/DashboardDateContext";

const DashboardContent = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">¡Bienvenido!</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de la actividad de monitoreo de medios
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <DateRangeFilter />
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Última actualización: {format(new Date(), "PPp", { locale: es })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <DashboardStatCard
          title="Prensa Digital"
          value={stats?.prensaDigital.today || 0}
          description={`${stats?.prensaDigital.total.toLocaleString() || 0} total`}
          icon={Newspaper}
          trend={stats?.prensaDigital.trend}
          isLoading={isLoading}
          onClick={() => navigate('/prensa-digital')}
        />
        <DashboardStatCard
          title="Radio"
          value={stats?.radio.today || 0}
          description={`${stats?.radio.total.toLocaleString() || 0} total`}
          icon={Radio}
          trend={stats?.radio.trend}
          isLoading={isLoading}
          onClick={() => navigate('/radio')}
        />
        <DashboardStatCard
          title="TV"
          value={stats?.tv.today || 0}
          description={`${stats?.tv.total.toLocaleString() || 0} total`}
          icon={Monitor}
          trend={stats?.tv.trend}
          isLoading={isLoading}
          onClick={() => navigate('/tv')}
        />
        <DashboardStatCard
          title="Prensa Escrita"
          value={stats?.prensaEscrita.thisWeek || 0}
          description={`${stats?.prensaEscrita.total.toLocaleString() || 0} total`}
          icon={FileText}
          isLoading={isLoading}
          onClick={() => navigate('/prensa-escrita')}
        />
        <DashboardStatCard
          title="Feeds Activos"
          value={stats?.feeds.active || 0}
          description={`${stats?.feeds.withErrors || 0} con errores`}
          icon={Rss}
          isLoading={isLoading}
          variant={stats?.feeds.withErrors && stats.feeds.withErrors > 0 ? 'warning' : 'default'}
        />
        <DashboardStatCard
          title="Clientes"
          value={stats?.clients.total || 0}
          description="Monitoreados"
          icon={Users}
          isLoading={isLoading}
          onClick={() => navigate('/clientes')}
        />
        <DashboardStatCard
          title="Alertas"
          value={stats?.alerts.unread || 0}
          description={`${stats?.alerts.total || 0} total`}
          icon={Bell}
          isLoading={isLoading}
          variant={stats?.alerts.unread && stats.alerts.unread > 0 ? 'warning' : 'default'}
          onClick={() => navigate('/clientes')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContentActivityChart />
        <SourceDistributionWidget />
      </div>

      {/* Category Breakdown - Full Width */}
      <CategoryBreakdownWidget />

      {/* Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeedHealthWidget />
        <ClientKeywordsWidget />
      </div>

      {/* Recent Activity & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityTimeline />
        <NotificationFeed maxItems={8} />
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <DashboardDateProvider>
      <DashboardContent />
    </DashboardDateProvider>
  );
};

export default Index;
