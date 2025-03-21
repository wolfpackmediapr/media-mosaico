
export type Notification = {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
};

export interface NotificationItemProps {
  notification: Notification;
  index: number;
  onMarkAsRead: (id: string) => void;
  textColor?: string;
  hoverBgColor?: string;
  dotColor?: string;
}

export interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  textColor?: string;
  hoverBgColor?: string;
  dividerColor?: string;
}

export interface NotificationPopoverProps {
  notifications?: Notification[];
  onNotificationsChange?: (notifications: Notification[]) => void;
  buttonClassName?: string;
  popoverClassName?: string;
  textColor?: string;
  hoverBgColor?: string;
  dividerColor?: string;
  headerBorderColor?: string;
  showViewAll?: boolean;
}

export const dummyNotifications: Notification[] = [
  {
    id: "1",
    title: "Nueva alerta",
    description: "Se ha detectado una mención importante",
    timestamp: new Date(),
    read: false,
  },
  {
    id: "2",
    title: "Actualización del sistema",
    description: "Mantenimiento programado para mañana",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: false,
  },
  {
    id: "3",
    title: "Recordatorio",
    description: "Reunión con el equipo a las 14:00",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: true,
  },
];
