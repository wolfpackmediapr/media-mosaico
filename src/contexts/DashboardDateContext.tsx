import React, { createContext, useContext, useState, ReactNode } from "react";
import { startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";

export type DatePreset = 'today' | '7days' | '30days' | 'thisWeek' | 'thisMonth' | 'custom';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
  preset: DatePreset;
}

interface DashboardDateContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: DatePreset) => void;
}

const DashboardDateContext = createContext<DashboardDateContextType | undefined>(undefined);

function getPresetDates(preset: DatePreset): { from: Date | undefined; to: Date | undefined } {
  const now = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case 'today':
      return { from: today, to: now };
    case '7days':
      return { from: subDays(today, 6), to: now };
    case '30days':
      return { from: subDays(today, 29), to: now };
    case 'thisWeek':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'thisMonth':
      return { from: startOfMonth(now), to: now };
    case 'custom':
      return { from: undefined, to: undefined };
    default:
      return { from: undefined, to: undefined };
  }
}

export function DashboardDateProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const dates = getPresetDates('7days');
    return { ...dates, preset: '7days' };
  });

  const setPreset = (preset: DatePreset) => {
    const dates = getPresetDates(preset);
    setDateRange({ ...dates, preset });
  };

  return (
    <DashboardDateContext.Provider value={{ dateRange, setDateRange, setPreset }}>
      {children}
    </DashboardDateContext.Provider>
  );
}

export function useDashboardDate() {
  const context = useContext(DashboardDateContext);
  if (!context) {
    throw new Error("useDashboardDate must be used within DashboardDateProvider");
  }
  return context;
}
