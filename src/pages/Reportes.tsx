
import { useReportData } from "@/hooks/use-report-data";
import ReportStats from "@/components/reports/ReportStats";
import MentionsChart from "@/components/reports/MentionsChart";
import RecentReportsList from "@/components/reports/RecentReportsList";

const Reportes = () => {
  const { recentReports, dailyMentions, stats } = useReportData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 mt-2">
          Visualiza y descarga reportes de monitoreo de medios
        </p>
      </div>

      <ReportStats 
        totalMentions={stats.totalMentions}
        reportsGenerated={stats.reportsGenerated}
        downloads={stats.downloads}
      />

      <MentionsChart data={dailyMentions} />

      <RecentReportsList reports={recentReports} />
    </div>
  );
};

export default Reportes;
