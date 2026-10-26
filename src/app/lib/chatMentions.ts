// @mentions in band chat, shared by the browser and the server.
// a message keeps its text as typed ("hey @Sam Lee") plus the list of who it
// mentions, worked out against the band's members when it's sent or edited

import { ChatMember, ChatMention } from "@/app/types";

// stands in for a user id when a message uses @everyone
export const MENTION_EVERYONE = "everyone";

// built at runtime since the ts target predates unicode property escapes
const WORD_CHAR = new RegExp("[\\p{L}\\p{N}_]", "u");

function isWordChar(char: string | undefined) {
  return !!char && WORD_CHAR.test(char);
}

// an @ only starts a mention at the start of the text or after a non-word
// character, so emails like sam@example.com aren't picked up
function canStartMention(text: string, at: number) {
  return text[at] === "@" && !isWordChar(text[at - 1]);
}

// who can be mentioned: the members, longest names first so "@Sam Lee" wins
// over a member just called "Sam", then @everyone
function mentionTargets(members: ChatMember[]): ChatMention[] {
  return [
    ...members
      .filter((m) => m.name.trim())
      .map((m) => ({ userId: m.userId, name: m.name.trim() }))
      .sort((a, b) => b.name.length - a.name.length),
    { userId: MENTION_EVERYONE, name: MENTION_EVERYONE },
  ];
}

function matchAt(text: string, at: number, targets: ChatMention[]) {
  if (!canStartMention(text, at)) return null;
  const rest = text.slice(at + 1).toLowerCase();
  return (
    targets.find(
      (t) =>
        rest.startsWith(t.name.toLowerCase()) &&
        !isWordChar(text[at + 1 + t.name.length]),
    ) ?? null
  );
}

// everyone the text mentions, each once, in the order they first appear
export function findMentions(
  text: string,
  members: ChatMember[],
): ChatMention[] {
  const targets = mentionTargets(members);
  const found = new Map<string, ChatMention>();
  for (let i = text.indexOf("@"); i !== -1; i = text.indexOf("@", i + 1)) {
    const match = matchAt(text, i, targets);
    if (match && !found.has(match.userId)) {
      // keep the name as it was written so it still highlights after a rename
      found.set(match.userId, {
        userId: match.userId,
        name: text.slice(i + 1, i + 1 + match.name.length),
      });
    }
  }
  return [...found.values()];
}

export type MentionPart = { text: string; mention?: ChatMention };

// splits text into plain runs and the @mentions inside it, for display
export function splitMentions(
  text: string,
  mentions: ChatMention[] | undefined,
): MentionPart[] {
  if (!mentions?.length) return [{ text }];
  const targets = [...mentions].sort((a, b) => b.name.length - a.name.length);

  const parts: MentionPart[] = [];
  let plainFrom = 0;
  for (let i = text.indexOf("@"); i !== -1; ) {
    const match = matchAt(text, i, targets);
    if (!match) {
      i = text.indexOf("@", i + 1);
      continue;
    }
    if (i > plainFrom) parts.push({ text: text.slice(plainFrom, i) });
    const end = i + 1 + match.name.length;
    parts.push({ text: text.slice(i, end), mention: match });
    plainFrom = end;
    i = text.indexOf("@", end);
  }
  if (plainFrom < text.length) parts.push({ text: text.slice(plainFrom) });
  return parts;
}

export function mentionsUser(
  mentions: ChatMention[] | undefined,
  userId: string,
) {
  return !!mentions?.some(
    (m) => m.userId === userId || m.userId === MENTION_EVERYONE,
  );
}

// the "@part" being typed just before the caret, if there is one. names can
// have spaces in them, so the query can too
export function activeMentionQuery(text: string, caret: number) {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1 || !canStartMention(text, at)) return null;
  const query = before.slice(at + 1);
  if (query.length > 40 || /\n/.test(query) || /\s{2}/.test(query)) {
    return null;
  }
  return { start: at, query };
}

// members whose name (or any word of it) starts with what's been typed
export function mentionSuggestions(
  query: string,
  members: ChatMember[],
  limit = 6,
): ChatMention[] {
  const q = query.toLowerCase();
  const matches = (name: string) => {
    const lower = name.toLowerCase();
    return (
      lower.startsWith(q) || lower.split(/\s+/).some((w) => w.startsWith(q))
    );
  };
  return [
    ...members
      .filter((m) => m.name.trim() && matches(m.name))
      .map((m) => ({ userId: m.userId, name: m.name.trim() })),
    ...(MENTION_EVERYONE.startsWith(q)
      ? [{ userId: MENTION_EVERYONE, name: MENTION_EVERYONE }]
      : []),
  ].slice(0, limit);
}
