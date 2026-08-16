export type CountryId = "philippines" | "thailand";

export type Country = {
  id: CountryId;
  name: string;
  latitude: number;
  longitude: number;
};

/** Curated countries for the dashboard hierarchy. Ids match regions.country. */
export const COUNTRIES: readonly Country[] = [
  {
    id: "philippines",
    name: "Philippines",
    latitude: 10.3157,
    longitude: 123.8854,
  },
  {
    id: "thailand",
    name: "Thailand",
    latitude: 13.7563,
    longitude: 100.5018,
  },
] as const;

export function getCountryById(id: string | null | undefined): Country | null {
  if (!id) return null;
  return COUNTRIES.find((c) => c.id === id) ?? null;
}

export function normalizeCountryId(value: string | null | undefined): string {
  return (value || "").toLowerCase().trim();
}
