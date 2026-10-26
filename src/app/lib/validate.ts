// runtime checks for server action arguments. actions can be called with any
// json the browser sends, and typescript types don't exist once deployed - an
// object like { $ne: null } passed where a string id is expected would
// otherwise go straight into a mongo query

import { UserError } from "@/app/lib/actionResult";

export function readString(value: unknown, label: string, maxLength = 1000) {
  if (typeof value !== "string") throw new UserError(`Invalid ${label}`);
  if (value.length > maxLength) throw new UserError(`${label} is too long`);
  return value;
}

export function readOptionalString(
  value: unknown,
  label: string,
  maxLength = 1000,
) {
  return value === undefined || value === null
    ? undefined
    : readString(value, label, maxLength);
}

export function readBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new UserError(`Invalid ${label}`);
  return value;
}

export function readOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  label: string,
): T {
  if (!options.includes(value as T)) throw new UserError(`Invalid ${label}`);
  return value as T;
}

// YYYY-MM-DD
export function readDateStr(value: unknown, label = "date") {
  const str = readString(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) throw new UserError(`Invalid ${label}`);
  return str;
}

// HH:MM, or nothing
export function readOptionalTime(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  const str = readString(value, label, 5);
  if (!/^\d{2}:\d{2}$/.test(str)) throw new UserError(`Invalid ${label}`);
  return str;
}

export function readStringArray(value: unknown, label: string, maxItems = 500) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new UserError(`Invalid ${label}`);
  }
  return value.map((item) => readString(item, label));
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

// our own custom song image / audio routes
const OWN_MEDIA_PATH =
  /^\/api\/(songs|albums)\/[a-f0-9]{24}\/(image|audio)(\?v=\d+)?$/;

// song images and previews are only ever on deezer's cdn or our own custom
// song routes. other links are dropped, so a song saved by one user can't make
// everyone who views it load an image or audio file from somewhere else
export function readSongMediaUrl(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  if (OWN_MEDIA_PATH.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname;
    return url.protocol === "https:" &&
      (host === "dzcdn.net" || host.endsWith(".dzcdn.net"))
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

// a song sent from the browser (a deezer result or a setlist entry), keeping
// only the fields we store
export function readSongInput(value: unknown) {
  if (!value || typeof value !== "object") throw new UserError("Invalid song");
  const song = value as Record<string, unknown>;

  const id =
    typeof song.id === "number" && Number.isSafeInteger(song.id)
      ? String(song.id)
      : readString(song.id, "song", 100);
  if (!id) throw new UserError("Invalid song");

  return {
    id,
    title: readOptionalString(song.title, "song title", 300) ?? "",
    artist: readOptionalString(song.artist, "artist", 300),
    album: readOptionalString(song.album, "album", 300),
    duration: readOptionalNumber(song.duration) ?? 0,
    preview: readSongMediaUrl(song.preview),
    image: readSongMediaUrl(song.image),
    isCustom: song.isCustom === true ? true : undefined,
    isCover: song.isCover === true ? true : undefined,
  };
}
