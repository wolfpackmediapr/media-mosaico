
/**
 * Convert a time string (HH:MM) to a Date object
 */
export function timeStringToDate(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

/**
 * Format a Date object to a time string (HH:MM)
 */
export function formatTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get day names for day codes
 */
export function getDayName(dayCode: string): string {
  const dayNames: Record<string, string> = {
    'Mon': 'Lunes',
    'Tue': 'Martes',
    'Wed': 'Miércoles',
    'Thu': 'Jueves',
    'Fri': 'Viernes',
    'Sat': 'Sábado',
    'Sun': 'Domingo'
  };
  
  return dayNames[dayCode] || dayCode;
}

/**
 * Format a list of day codes to readable day names
 */
export function formatDays(days: string[]): string {
  if (!days || days.length === 0) return 'Ninguno';
  
  return days.map(day => getDayName(day)).join(', ');
}
