
export type NotificationAlert = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  status: "unread" | "read" | "archived";
  importance_level: number;
  content_id: string | null;
  content_type: string | null;
  keyword_matched: string[] | null;
  client_id: string | null;
  clients?: { name: string } | null;
  metadata: any | null;
};
