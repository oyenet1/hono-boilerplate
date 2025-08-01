/**
 * Utility functions for formatting various data types
 */

/**
 * Formats uptime in seconds to a human-readable string
 * @param uptimeInSeconds - The uptime in seconds (from process.uptime())
 * @returns Formatted uptime string (e.g., "1h 23m 45s")
 */
export function formatUptime(uptimeInSeconds: number): string {
  const hours = Math.floor(uptimeInSeconds / 3600);
  const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeInSeconds % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
}
