// general utility functions shared across the app

//  format a Date as "Mon, Apr 16" style string.
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Europe/London",
  });
}

// format a Date as "Wed, April 16" style string (long month).
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "long",
    day: "numeric",
    timeZone: "Europe/London",
  });
}

//  pluralise(3, "song") into "3 songs"
export function pluralise(
  count: number,
  singular: string,
  plural?: string,
): string {
  return `${count} ${count === 1 ? singular : (plural ?? singular + "s")}`;
}
