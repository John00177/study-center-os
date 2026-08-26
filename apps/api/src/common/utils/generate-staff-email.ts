import { PrismaService } from "../../prisma/prisma.service";

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function slugifyPart(s: string): string {
  return s
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "") // strip accents after NFD decomposition
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/**
 * firstname.lastname@{orgSlug}.uz, lowercased and accent-stripped, with a
 * numeric suffix on collision. Falls back to "staff"/"member" for names that
 * don't split into first/last (single word, or a name that's entirely
 * non-Latin and strips to nothing).
 */
export async function generateStaffEmail(prisma: PrismaService, fullName: string, orgSlug: string): Promise<string> {
  const parts = fullName.trim().split(/\s+/).map(slugifyPart).filter(Boolean);
  const first = parts[0] || "staff";
  const last = parts.slice(1).join(".") || "member";
  const base = `${first}.${last}`;
  const domain = `${orgSlug}.uz`;

  let candidate = `${base}@${domain}`;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { email: candidate } })) {
    candidate = `${base}${suffix}@${domain}`;
    suffix++;
  }
  return candidate;
}
