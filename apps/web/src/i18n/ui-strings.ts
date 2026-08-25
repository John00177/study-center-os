import { part1 } from "./parts/part1";
import { part2 } from "./parts/part2";
import { part3 } from "./parts/part3";
import { part4 } from "./parts/part4";
import { part5 } from "./parts/part5";
import { part6 } from "./parts/part6";
import { part7 } from "./parts/part7";
import { part8 } from "./parts/part8";

/**
 * Project-wide UI strings, keyed by the English source text.
 *
 * Keying by the English string (rather than a synthetic id) means English
 * needs no dictionary at all, and any string that is newly added or was
 * missed by the sweep simply renders in English instead of leaking a raw key
 * to the user. See hooks/use-translation.ts for the lookup order.
 *
 * Each part file holds `english: [uzbek, russian]` tuples so a string is
 * written once and the two locales can't drift out of sync.
 */
export type StringPart = Record<string, readonly [uz: string, ru: string]>;

const parts: StringPart[] = [part1, part2, part3, part4, part5, part6, part7, part8];

function build(index: 0 | 1): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of parts) {
    for (const key in part) out[key] = part[key][index];
  }
  return out;
}

export const uiStrings: Record<string, Record<string, string>> = {
  uz: build(0),
  ru: build(1),
};
