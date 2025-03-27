
import { useState } from "react";

// Define types for our report data
export interface ReportSummary {
  id: number;
  name: string;
  date: string;
  type: "TV" | "Radio" | "Prensa";
  mentions: number;
}

export interface DailyMention {
  name: string;
  menciones: number;
}

export const useReportData = () => {
  // Mock data for now - in a real app, this would fetch from an API
  const [recentReports] = useState<ReportSummary[]>([
    {
      id: 1,
      name: "Reporte Semanal TV",
      date: "2024-02-20",
      type: "TV",
      mentions: 245,
    },
    {
      id: 2,
      name: "Análisis Radio Mensual",
      date: "2024-02-19",
      type: "Radio",
      mentions: 189,
    },
    {
      id: 3,
      name: "Resumen Prensa Digital",
      date: "2024-02-18",
      type: "Prensa",
      mentions: 312,
    },
  ]);

  const [dailyMentions] = useState<DailyMention[]>([
    { name: "Lun", menciones: 40 },
    { name: "Mar", menciones: 30 },
    { name: "Mie", menciones: 45 },
    { name: "Jue", menciones: 25 },
    { name: "Vie", menciones: 55 },
    { name: "Sab", menciones: 20 },
    { name: "Dom", menciones: 15 },
  ]);

  const [stats] = useState({
    totalMentions: 746,
    reportsGenerated: 24,
    downloads: 18,
  });

  return {
    recentReports,
    dailyMentions,
    stats,
  };
};
