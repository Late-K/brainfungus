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

//  pluralise(3, "song") into "3 songs"
export function pluralise(
  count: number,
  singular: string,
  plural?: string,
): string {
  return `${count} ${count === 1 ? singular : (plural ?? singular + "s")}`;
}

// where to send someone after signing in. only paths on this site are
// allowed - "//evil.com" or "https://evil.com" would make the login page an
// open redirect that phishing links could use. backslashes, whitespace and
// control characters are refused too, since browsers drop tabs and newlines
// from urls ("/\t/evil.com" becomes "//evil.com") and treat \ like /
export function safeRedirectPath(value: unknown): string {
  return typeof value === "string" &&
    /^\/(?![/\\])/.test(value) &&
    !/[\s\\\u0000-\u001f\u007f]/.test(value)
    ? value
    : "/";
}
