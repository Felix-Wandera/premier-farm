import { Gender, Species } from "@prisma/client";

export type ActionResponse<T = undefined> = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  code?: "VALIDATION_ERROR" | "OUTLIER_WARNING" | "FORBIDDEN";
  warnings?: string[];
  canOverride?: boolean;
  data?: T;
};

export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function normalizeAnimalName(input: string): string {
  return normalizeWhitespace(input);
}

export function normalizeTagNumber(input?: string | null): string | null {
  if (!input) return null;
  const cleaned = normalizeWhitespace(input).toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

const SPECIES_LOOKUP: Record<string, Species> = {
  DAIRY_COW: "DAIRY_COW",
  "DAIRY COW": "DAIRY_COW",
  INDIGENOUS_COW: "INDIGENOUS_COW",
  INDIGENOUS: "INDIGENOUS_COW",
  "INDIGENOUS COW": "INDIGENOUS_COW",
  BULL: "BULL",
  HEIFER: "HEIFER",
  SHEEP: "SHEEP",
  GOAT: "GOAT",
};

export function parseSpecies(input?: string | null): Species | null {
  if (!input) return null;
  const key = normalizeWhitespace(input).toUpperCase();
  return SPECIES_LOOKUP[key] || null;
}

export function formatSpeciesLabel(species: string): string {
  switch (species) {
    case "DAIRY_COW":
      return "Dairy Cow";
    case "INDIGENOUS_COW":
      return "Indigenous";
    case "BULL":
      return "Bull";
    case "HEIFER":
      return "Heifer";
    case "SHEEP":
      return "Sheep";
    case "GOAT":
      return "Goat";
    default:
      return species;
  }
}

export type SpeciesFamily = "CATTLE" | "SHEEP" | "GOAT";

export function getSpeciesFamily(species: Species | string): SpeciesFamily {
  if (species === "SHEEP") return "SHEEP";
  if (species === "GOAT") return "GOAT";
  return "CATTLE";
}

/**
 * Enforces biological sex constraints:
 * - BULL must be MALE
 * - DAIRY_COW and HEIFER must be FEMALE
 * - INDIGENOUS_COW, SHEEP, GOAT allow MALE or FEMALE
 */
export function validateSpeciesGender(
  species: Species,
  gender: Gender
): string | null {
  if (species === "BULL" && gender !== "MALE") {
    return "A Bull must have Male gender.";
  }
  if ((species === "DAIRY_COW" || species === "HEIFER") && gender !== "FEMALE") {
    return `A ${formatSpeciesLabel(species)} must have Female gender.`;
  }
  return null;
}

/**
 * Parses a `YYYY-MM-DD` or ISO date string safely into a local Date at midnight (00:00:00)
 * so timezone offsets never shift calendar days backward or forward.
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const d = new Date(year, month, day, 0, 0, 0, 0);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  const fallback = new Date(dateStr);
  if (isNaN(fallback.getTime())) return null;
  return fallback;
}

export function getEndOfToday(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getStartOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}
