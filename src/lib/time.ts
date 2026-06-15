/**
 * Pakistan Standard Time (PKT) Utilities
 * Aligns app logic with GMT+5
 */

export const PK_TIMEZONE = 'Asia/Karachi';

/**
 * Returns a new Date object. 
 * Note: JS Date objects are always UTC.
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Returns formatted Pakistan Time string (e.g., "02:30 PM")
 */
export function formatPKTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

/**
 * Returns formatted Pakistan Date string (e.g., "Jun 13, 2026")
 */
export function formatPKDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PK_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

/**
 * Returns Pakistan Date object at start of day (00:00:00)
 * Useful for "Today" filters.
 */
export function getPKTodayStart(): Date {
  const now = new Date();
  const pkDateStr = new Intl.DateTimeFormat('en-CA', { // YYYY-MM-DD
    timeZone: PK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  
  const [year, month, day] = pkDateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Returns YYYY-MM-DD for today in Pakistan
 */
export function getPKTodayString(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { // YYYY-MM-DD
    timeZone: PK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

/**
 * Checks if a given UTC ISO string falls on the "current" day in Pakistan
 */
export function isTodayInPK(isoString: string): boolean {
  const today = getPKTodayString();
  const target = new Intl.DateTimeFormat('en-CA', {
    timeZone: PK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(isoString));
  
  return today === target;
}
