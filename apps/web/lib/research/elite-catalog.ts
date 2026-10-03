/** Public 13F filers and listed vehicles. No Yahoo/SEC fetch here. */

export type EliteCatalogRow = {
  slug: string;
  name: string;
  firm: string;
  /** 10-digit CIK or null when there is no current 13F filer. */
  cik: string | null;
  /** Yahoo symbol for a public share class, or null. */
  vehicleTicker: string | null;
  vehicleNote: string;
};

export const ELITE_INVESTORS: readonly EliteCatalogRow[] = [
  {
    slug: "buffett",
    name: "Warren Buffett",
    firm: "Berkshire Hathaway",
    cik: "0001067983",
    vehicleTicker: "BRK-B",
    vehicleNote: "Berkshire Hathaway Class B (BRK-B) total return.",
  },
  {
    slug: "lynch",
    name: "Peter Lynch",
    firm: "Formerly Fidelity Magellan",
    cik: null,
    vehicleTicker: "FMAGX",
    vehicleNote:
      "Lynch left Magellan in 1990. Returns are Fidelity Magellan (FMAGX), not a personal 13F.",
  },
  {
    slug: "simons",
    name: "Jim Simons",
    firm: "Renaissance Technologies",
    cik: "0001037389",
    vehicleTicker: null,
    vehicleNote:
      "Medallion and RIEF are private. No public share class — 13F is long US stocks only.",
  },
  {
    slug: "icahn",
    name: "Carl Icahn",
    firm: "Icahn Enterprises",
    cik: "0001412093",
    vehicleTicker: "IEP",
    vehicleNote: "Icahn Enterprises L.P. (IEP) total return.",
  },
  {
    slug: "druckenmiller",
    name: "Stanley Druckenmiller",
    firm: "Duquesne Capital",
    cik: "0001536411",
    vehicleTicker: null,
    vehicleNote: "Duquesne Family Office has no public share class. 13F longs only.",
  },
  {
    slug: "soros",
    name: "George Soros",
    firm: "Soros Fund Management",
    cik: "0001029160",
    vehicleTicker: null,
    vehicleNote: "Soros Fund Management has no public share class. 13F longs only.",
  },
  {
    slug: "dalio",
    name: "Ray Dalio",
    firm: "Bridgewater Associates",
    cik: "0001350694",
    vehicleTicker: null,
    vehicleNote: "Bridgewater funds are private. 13F longs only, not Pure Alpha NAV.",
  },
  {
    slug: "ackman",
    name: "Bill Ackman",
    firm: "Pershing Square Capital",
    cik: "0001336528",
    vehicleTicker: "PSHZF",
    vehicleNote: "Pershing Square Holdings (PSHZF) total return.",
  },
  {
    slug: "cohen",
    name: "Steve Cohen",
    firm: "Point72 Asset Management",
    cik: "0001603466",
    vehicleTicker: null,
    vehicleNote: "Point72 is private. 13F longs only.",
  },
  {
    slug: "tepper",
    name: "David Tepper",
    firm: "Appaloosa Management",
    cik: "0001656456",
    vehicleTicker: null,
    vehicleNote: "Appaloosa is private. 13F longs only.",
  },
  {
    slug: "fisher",
    name: "Ken Fisher",
    firm: "Fisher Investments",
    cik: null,
    vehicleTicker: null,
    vehicleNote:
      "Fisher Investments is an RIA and does not have a current 13F-HR under a public CIK we can resolve. Refresh will not invent holdings.",
  },
  {
    slug: "griffin",
    name: "Kenneth C. Griffin",
    firm: "Citadel",
    cik: "0001423053",
    vehicleTicker: null,
    vehicleNote: "Citadel funds are private. 13F longs only, not hedge-fund NAV.",
  },
  {
    slug: "munger",
    name: "Charlie Munger",
    firm: "Formerly Berkshire Hathaway",
    cik: "0001067983",
    vehicleTicker: "BRK-B",
    vehicleNote:
      "Munger did not file a separate 13F. This is the same Berkshire book as Buffett. BRK-B total return.",
  },
  {
    slug: "gates",
    name: "Bill Gates",
    firm: "Cascade Investment / Gates Foundation",
    cik: "0001166559",
    vehicleTicker: null,
    vehicleNote:
      "Cascade is private. Holdings are the Gates Foundation Trust 13F, not Cascade.",
  },
  {
    slug: "einhorn",
    name: "David Einhorn",
    firm: "Greenlight Capital",
    cik: "0001079114",
    vehicleTicker: null,
    vehicleNote: "Greenlight is private. 13F longs only.",
  },
  {
    slug: "klarman",
    name: "Seth Klarman",
    firm: "Baupost Group",
    cik: "0001061768",
    vehicleTicker: null,
    vehicleNote: "Baupost is private. 13F longs only.",
  },
  {
    slug: "burry",
    name: "Michael Burry",
    firm: "Scion Asset Management",
    cik: "0001649339",
    vehicleTicker: null,
    vehicleNote: "Scion is private. 13F longs only.",
  },
  {
    slug: "jones",
    name: "Paul Tudor Jones II",
    firm: "Tudor Investment Corporation",
    cik: null,
    vehicleTicker: null,
    vehicleNote:
      "Tudor’s last EDGAR 13F-HR under the historic CIK is from 2009. No current public book.",
  },
  {
    slug: "hohn",
    name: "Chris Hohn",
    firm: "TCI Fund Management",
    cik: "0001647251",
    vehicleTicker: null,
    vehicleNote: "TCI funds are private. 13F longs only.",
  },
  {
    slug: "robertson",
    name: "Julian Robertson",
    firm: "Formerly Tiger Management",
    cik: null,
    vehicleTicker: null,
    vehicleNote:
      "Tiger Management stopped filing 13F years ago. No current public book.",
  },
] as const;

export function eliteBySlug(slug: string): EliteCatalogRow | null {
  return ELITE_INVESTORS.find((row) => row.slug === slug) ?? null;
}
