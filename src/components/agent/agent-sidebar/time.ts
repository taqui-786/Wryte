export function formatRelativeTime(
  date: Date | string | null | undefined,
): string {
  if (!date) return "";

  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();

  if (Number.isNaN(diff)) return "";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return target.toLocaleDateString();
}
