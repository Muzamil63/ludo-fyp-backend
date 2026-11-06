// Date / time text helpers (written by hand so they look the same on every phone).
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

export function formatTime(value: string | number | Date): string {
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "Today, 18:05" / "Tomorrow, 09:30" / "Wed 12 Nov, 18:05"
export function formatDateTime(value: string | number | Date): string {
  const d = new Date(value);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return `Today, ${formatTime(d)}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${formatTime(d)}`;
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${formatTime(d)}`;
}

// "2h 05m", "4m 09s", "12s", or "now"
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

export const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

export const matchTypeLabel: Record<string, string> = {
  bot: 'vs Computer',
  online: 'Online',
  room: 'Private room',
  tournament: 'Tournament',
};
