/** Canonical company labels used in sessions + Weak Spots chips */
export const KNOWN_COMPANY_NAMES = ["Amazon", "Meta", "Google"] as const;

/** Bucket for blank, missing, or unrecognized company strings */
export const OTHER_COMPANY = "Other";

/**
 * Map a raw session/URL company value to a known display name, or Other.
 * "amazon" → "Amazon"; "" / "Amazom" → "Other"
 */
export function canonicalizeCompany(raw: unknown): string {
  if (typeof raw !== "string") return OTHER_COMPANY;
  const trimmed = raw.trim();
  if (!trimmed) return OTHER_COMPANY;

  const known = KNOWN_COMPANY_NAMES.find(
    (name) => name.toLowerCase() === trimmed.toLowerCase()
  );
  return known ?? OTHER_COMPANY;
}

export function isOtherCompany(company: string | undefined): boolean {
  return canonicalizeCompany(company) === OTHER_COMPANY;
}
