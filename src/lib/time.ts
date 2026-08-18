/**
 * A compact "how long ago" label. Lived as a private function at the bottom of
 * HomeView until Activity needed the identical thing; two screens phrasing "2h ago"
 * two different ways is the kind of drift one small module prevents.
 */
export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
