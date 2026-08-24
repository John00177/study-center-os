import { randomInt } from "crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — avoids confusion with 1/0
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALL = UPPER + LOWER + DIGITS;

function pick(chars: string): string {
  return chars[randomInt(chars.length)];
}

/** Random 8-char temp password guaranteed to contain upper, lower, and a digit. */
export function generateTempPassword(): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  const rest = Array.from({ length: 5 }, () => pick(ALL));
  const chars = [...required, ...rest];
  // Fisher-Yates shuffle so the required chars aren't always in the same slots.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
