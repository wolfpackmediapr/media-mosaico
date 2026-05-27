import { supabase } from "@/integrations/supabase/client";
import { createNotification, NotificationData } from "./unifiedNotificationService";
import { normalizeText } from "@/lib/textNormalize";

export interface ClientMatchNotificationInput {
  matchedClients: string[];
  title: (clientName: string) => string;
  description?: string;
  content_id?: string;
  content_type: NotificationData["content_type"];
  keyword_matched?: string[];
  importance_level?: number;
  metadata?: Record<string, any>;
  /** Dedupe window in minutes; default 10. */
  dedupeWindowMinutes?: number;
}

/**
 * Resolve matched client names (from AI analysis) to real public.clients rows
 * and create one notification per matched, active client. Skips silently when
 * there are no matches. Logs (and surfaces) genuine errors.
 */
export const createClientMatchNotifications = async (
  input: ClientMatchNotificationInput
): Promise<{ created: number; skipped: number; errors: number }> => {
  const result = { created: 0, skipped: 0, errors: 0 };
  const names = (input.matchedClients || []).map((n) => (n || "").trim()).filter(Boolean);
  if (names.length === 0) return result;

  const { data: clientsData, error } = await supabase
    .from("clients")
    .select("id, name, is_active")
    .eq("is_active", true);

  if (error) {
    console.error("[createClientMatchNotifications] Error fetching clients:", error);
    result.errors += 1;
    return result;
  }

  if (!clientsData || clientsData.length === 0) return result;

  const normalizedTargets = names.map(normalizeText);
  const matches = clientsData.filter((c) =>
    normalizedTargets.includes(normalizeText(c.name || ""))
  );

  if (matches.length === 0) return result;

  const windowMs = (input.dedupeWindowMinutes ?? 10) * 60 * 1000;
  const sinceIso = new Date(Date.now() - windowMs).toISOString();

  for (const client of matches) {
    try {
      if (input.content_id && input.content_type) {
        const { data: existing, error: dupErr } = await supabase
          .from("client_alerts")
          .select("id")
          .eq("client_id", client.id)
          .eq("content_id", input.content_id)
          .eq("content_type", input.content_type)
          .gte("created_at", sinceIso)
          .limit(1);

        if (dupErr) {
          console.error("[createClientMatchNotifications] Dedupe check error:", dupErr);
        } else if (existing && existing.length > 0) {
          result.skipped += 1;
          continue;
        }
      }

      const res = await createNotification({
        client_id: client.id,
        title: input.title(client.name),
        description: input.description,
        content_id: input.content_id,
        content_type: input.content_type,
        keyword_matched: input.keyword_matched,
        importance_level: input.importance_level ?? 3,
        metadata: {
          ...(input.metadata || {}),
          matchedClientName: client.name,
        },
      });

      if (res?.success) result.created += 1;
      else if ((res as any)?.skipped) result.skipped += 1;
      else result.errors += 1;
    } catch (e) {
      console.error("[createClientMatchNotifications] Insert error:", e);
      result.errors += 1;
    }
  }

  return result;
};