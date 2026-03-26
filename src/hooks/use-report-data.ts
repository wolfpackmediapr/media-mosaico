
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Define types for our report data
export interface ReportSummary {
  id: number | string;
  name: string;
  date: string;
  type: "TV" | "Radio" | "Prensa";
  mentions: number;
}

export interface DailyMention {
  name: string;
  menciones: number;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export const useReportData = () => {
  const [recentReports, setRecentReports] = useState<ReportSummary[]>([]);
  const [dailyMentions, setDailyMentions] = useState<DailyMention[]>([]);
  const [stats, setStats] = useState({
    totalMentions: 0,
    reportsGenerated: 0,
    downloads: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch recent reports from the reports table
        const { data: reports, error: reportsError } = await supabase
          .from("reports")
          .select("id, title, type, created_at, status")
          .order("created_at", { ascending: false })
          .limit(10);

        if (reportsError) {
          console.error("Error fetching reports:", reportsError);
        }

        // Map reports to the expected shape
        const mappedReports: ReportSummary[] = (reports || []).map((r) => ({
          id: r.id,
          name: r.title,
          date: r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : "",
          type: mapReportType(r.type),
          mentions: 0, // Reports table doesn't store mention counts directly
        }));

        setRecentReports(mappedReports);

        // 2. Compute daily mentions from the last 7 days across all media types
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const sinceDate = sevenDaysAgo.toISOString();

        // Count TV transcriptions per day
        const { data: tvData } = await supabase
          .from("tv_transcriptions")
          .select("created_at")
          .gte("created_at", sinceDate);

        // Count radio transcriptions per day
        const { data: radioData } = await supabase
          .from("radio_transcriptions")
          .select("created_at")
          .gte("created_at", sinceDate);

        // Count press clippings per day
        const { data: pressData } = await supabase
          .from("press_clippings")
          .select("created_at")
          .gte("created_at", sinceDate);

        // Count news articles per day
        const { data: newsData } = await supabase
          .from("news_articles")
          .select("created_at")
          .gte("created_at", sinceDate);

        // Aggregate all items by day of week for the last 7 days
        const dailyCounts = buildDailyMentions(
          [...(tvData || []), ...(radioData || []), ...(pressData || []), ...(newsData || [])],
          sevenDaysAgo
        );
        setDailyMentions(dailyCounts);

        // 3. Compute stats
        const totalMentions =
          (tvData?.length || 0) +
          (radioData?.length || 0) +
          (pressData?.length || 0) +
          (newsData?.length || 0);

        const reportsGenerated = reports?.length || 0;

        // Count reports with file_path as "downloads" (reports that have been generated/exported)
        const { count: downloadCount } = await supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .not("file_path", "is", null);

        setStats({
          totalMentions,
          reportsGenerated,
          downloads: downloadCount || 0,
        });
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, []);

  return {
    recentReports,
    dailyMentions,
    stats,
    isLoading,
  };
};

/**
 * Map the report type string from DB to the expected union type.
 */
function mapReportType(type: string): "TV" | "Radio" | "Prensa" {
  const normalized = type?.toLowerCase() || "";
  if (normalized.includes("tv") || normalized.includes("television")) return "TV";
  if (normalized.includes("radio")) return "Radio";
  if (normalized.includes("prensa") || normalized.includes("press")) return "Prensa";
  return "TV"; // default fallback
}

/**
 * Build daily mention counts for the last 7 days from a combined list of items.
 */
function buildDailyMentions(
  items: { created_at: string | null }[],
  startDate: Date
): DailyMention[] {
  // Initialize counts for each of the last 7 days
  const dayCounts: Record<string, number> = {};
  const dayOrder: string[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const label = DAY_LABELS[d.getDay()];
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dayCounts[key] = 0;
    dayOrder.push(key);
  }

  // Build a map from key to label
  const keyToLabel: Record<string, string> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    keyToLabel[key] = DAY_LABELS[d.getDay()];
  }

  // Count items per day
  for (const item of items) {
    if (!item.created_at) continue;
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key in dayCounts) {
      dayCounts[key]++;
    }
  }

  return dayOrder.map((key) => ({
    name: keyToLabel[key],
    menciones: dayCounts[key],
  }));
}
