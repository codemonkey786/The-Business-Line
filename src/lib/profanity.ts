// A small, deliberately conservative list of common English profanity/slurs — whole-word
// matching only (via \b boundaries) so it doesn't false-positive on words like "class" or
// "assessment" that merely contain a shorter bad word as a substring.
const BLOCKED_WORDS = [
  "fuck",
  "fucking",
  "fucker",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "piss",
  "cunt",
  "cock",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "retarded",
];

const PATTERN = new RegExp(`\\b(${BLOCKED_WORDS.join("|")})\\b`, "i");

export function containsProfanity(...texts: (string | undefined)[]): boolean {
  return texts.some((t) => t && PATTERN.test(t));
}
