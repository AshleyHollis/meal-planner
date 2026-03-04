/**
 * Format a date string as a relative date label.
 * "Created today", "Created yesterday", "Created 3 days ago", "Created Mar 1"
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  // Compare calendar days (not 24h periods)
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = todayDay.getTime() - dateDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Created today";
  if (diffDays === 1) return "Created yesterday";
  if (diffDays < 7) return `Created ${diffDays} days ago`;

  return `Created ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
