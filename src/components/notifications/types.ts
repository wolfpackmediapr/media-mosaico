
export type NotificationItem = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  status: "unread" | "read" | "archived";
  importance: number;
  clientName?: string | null;
  clientId?: string | null;
  keywords?: string[];
};
