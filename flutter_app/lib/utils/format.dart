// Date / time text helpers (written by hand so they look the same on every phone).
const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
String _pad(int n) => n.toString().padLeft(2, '0');

String formatTime(DateTime d) => '${_pad(d.hour)}:${_pad(d.minute)}';

/// "Today, 18:05" / "Tomorrow, 09:30" / "Wed 12 Nov, 18:05"
String formatDateTime(DateTime d) {
  final now = DateTime.now();
  bool sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;
  if (sameDay(d, now)) return 'Today, ${formatTime(d)}';
  if (sameDay(d, now.add(const Duration(days: 1)))) return 'Tomorrow, ${formatTime(d)}';
  return '${_days[d.weekday - 1]} ${d.day} ${_months[d.month - 1]}, ${formatTime(d)}';
}

/// "2h 05m", "4m 09s", "12s", or "now"
String formatCountdown(Duration left) {
  if (left.inSeconds <= 0) return 'now';
  final h = left.inHours;
  final m = left.inMinutes % 60;
  final s = left.inSeconds % 60;
  if (h > 24) return '${h ~/ 24}d ${h % 24}h';
  if (h > 0) return '${h}h ${_pad(m)}m';
  if (m > 0) return '${m}m ${_pad(s)}s';
  return '${s}s';
}

String ordinal(int n) => n == 1 ? '1st' : n == 2 ? '2nd' : n == 3 ? '3rd' : '${n}th';

const Map<String, String> matchTypeLabel = {
  'bot': 'vs Computer',
  'online': 'Online',
  'room': 'Private room',
  'tournament': 'Tournament',
};
