/**
 * Dates and times in the phone's own format (Intl with the phone's
 * locale). Pure, checked by `npm test`.
 */

function fmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, opts);
  } catch {
    return new Intl.DateTimeFormat('en-US', opts);
  }
}

/** "9:05 AM" / "09:05". */
export function formatTime(ms: number, locale = 'en-US'): string {
  return fmt(locale, { hour: 'numeric', minute: '2-digit' }).format(ms);
}

/** "Nov 27" */
export function formatShortDate(ms: number, locale = 'en-US'): string {
  return fmt(locale, { month: 'short', day: 'numeric' }).format(ms);
}

/** "Nov 27, 2026" */
export function formatDate(ms: number, locale = 'en-US'): string {
  return fmt(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(ms);
}

/** "Fri" */
export function formatWeekday(ms: number, locale = 'en-US'): string {
  return fmt(locale, { weekday: 'short' }).format(ms);
}

/** "9 AM" / "09" for an hour tick. */
export function formatHour(ms: number, locale = 'en-US'): string {
  return fmt(locale, { hour: 'numeric' }).format(ms);
}

/** "Today, 9:05 AM", "Yesterday, 6:40 PM", "Nov 20, 7:15 AM". */
export function formatMoment(ms: number, now: number, locale = 'en-US'): string {
  const day = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  const time = formatTime(ms, locale);
  if (day(ms) === day(now)) return `Today, ${time}`;
  if (day(ms) === day(now - 86_400_000)) return `Yesterday, ${time}`;
  return `${formatShortDate(ms, locale)}, ${time}`;
}

/** "Just now", "4 min ago", "2 hours ago", or the moment for older. */
export function formatAgo(ms: number, now: number, locale = 'en-US'): string {
  const s = Math.max(0, now - ms);
  if (s < 90_000) return 'Just now';
  const m = Math.round(s / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 12) return h === 1 ? '1 hour ago' : `${h} hours ago`;
  return formatMoment(ms, now, locale);
}

/** A tick label on the time axis for a range. */
export function tickLabel(ms: number, range: '3h' | '24h' | '7d' | '30d', locale = 'en-US'): string {
  if (range === '3h' || range === '24h') return formatHour(ms, locale);
  if (range === '7d') return formatWeekday(ms, locale);
  return formatShortDate(ms, locale);
}
