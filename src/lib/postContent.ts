export type ImageAlign = "left" | "center" | "right";
export type PostContentBlock = { type: "text"; text: string } | { type: "image"; url: string; align: ImageAlign };

// The alignment token is optional in the marker for backward compatibility with posts written
// before alignment existed — no token (`![](url)`) means center.
const IMAGE_MARKER = /!\[(left|right)?\]\(([^)]+)\)/g;

// A minimal inline-image marker (`![align](url)`) inserted by the composer's "Insert Image"
// button — not full markdown, just enough to let images sit between paragraphs (and float
// left/right) instead of being stuck as a single cover image. Scans for the marker anywhere in
// the string (not just on its own line) since contentEditable browsers don't reliably keep a
// literal newline around a block image once you keep typing around it.
export function parsePostBody(body: string): PostContentBlock[] {
  const blocks: PostContentBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  IMAGE_MARKER.lastIndex = 0;

  while ((match = IMAGE_MARKER.exec(body))) {
    const before = body.slice(lastIndex, match.index).trim();
    if (before) blocks.push({ type: "text", text: before });
    const align: ImageAlign = match[1] === "left" || match[1] === "right" ? match[1] : "center";
    blocks.push({ type: "image", url: match[2], align });
    lastIndex = match.index + match[0].length;
  }

  const rest = body.slice(lastIndex).trim();
  if (rest) blocks.push({ type: "text", text: rest });
  return blocks;
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

// Splits a line of credits/sources text into plain-text and URL segments so the reader can
// render real, clickable links — kept as pure string data (no JSX) so this stays usable outside
// a React file; the actual <a> rendering happens where it's displayed.
export function splitTextAndUrls(text: string): { text: string; isUrl: boolean }[] {
  const parts = text.split(URL_PATTERN);
  return parts.filter((p) => p.length > 0).map((p) => ({ text: p, isUrl: p.startsWith("http://") || p.startsWith("https://") }));
}
