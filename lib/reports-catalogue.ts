export type SimpleJobType =
  | "health-overview"
  | "clinical-overview"
  | "longevity-screener"
  | "pgx"
  | "carrier-status"
  | "ancestry"
  | "bio-chemistry"

export type JobStatus =
  | "init" | "profile_upserted" | "waiting_file_processing" | "file_processed"
  | "waiting_report_gen" | "report_generated" | "waiting_pdf" | "pdf_generated"
  | "failed_downloading_file" | "failed_uploading_file" | "failed_file_processing"
  | "failed_report_gen" | "failed_pdf"
  | "waiting" | "completed" | "failed"

/**
 * Report types as returned by the /report-summary/ API's `report_type` field.
 *
 * Genetic:
 *   "standard"   – general health reports (e.g. Low Mood, Acne, Joint Pain)
 *   "trait"      – personality / trait reports (e.g. introvert, night owl)
 *   "gene"       – single-gene / neurotransmitter / biohacker reports
 *   "aggregate"  – summary reports that collect results across a topic (e.g. Sleep, Gut Health)
 *   "combined"   – extended aggregates with combo-outcome advice (Diet & Nutrition, Fitness)
 *
 * Non-genetic:
 *   "non-genetic" – generic blog-style content, not profile-specific
 */
export type ReportType = "standard" | "trait" | "gene" | "aggregate" | "combined" | "non-genetic"

export interface CatalogueItem {
  id: string
  label: string
  price: number
  type: "simple" | "report"
  jobType?: SimpleJobType
  ancestryType?: "ancestry" | "mtdna"

  /**
   * For type="report" items: which report_type values to include when
   * fetching from /report-summary/. Replaces the old searchQuery/filterBy.
   *
   * Additionally, an optional `listingType` can narrow results further
   * (e.g. "medicinal" vs "functional") when multiple report_types share
   * the same listing bucket.
   */
  reportTypes?: ReportType[]
  listingType?: string

  /** Whether the UI should show the All / Summary Only / Report Only dropdown. */
  showSelection?: boolean
  note?: string
}

export interface Bundle {
  id: string
  label: string
  price: number
  itemIds: string[]
  description?: string
}

export interface AnyJob {
  id: string
  status: string
  desired_status?: string
  profile_id?: string
  report_id?: string
  report_name?: string
  job_type: string
  job_label: string
  /** The catalogue item id this job maps to, for filtering in the Jobs tab. */
  catalogue_item_id?: string
  pdf_url?: string | null
  error?: string
  handling_failed?: boolean
  created_at: string
  finished_at?: string | null
}

export interface PaginatedJobs {
  jobs: AnyJob[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ReportSummary {
  id: string
  name: string
  report_type: ReportType | string
  area: string[]
  is_deprecated: boolean
  listing_type?: string
}

// ─── Catalogue ────────────────────────────────────────────────────────────────
//
// Classification rationale per report_type:
//
//  Health Reports     → report_type: "standard" + "aggregate" + "combined"
//                       listing_type: any (health-oriented)
//                       showSelection: true because aggregates (summaries) vs
//                       individual (standard) is a meaningful split.
//
//  Traits             → report_type: "trait"
//
//  Functional Reports → report_type: "aggregate" + "gene"
//                       listing_type: "functional"
//                       Always show all — no meaningful summary/individual split.
//
//  Medical Reports    → report_type: "standard"
//                       listing_type: "medicinal"
//                       Always show all — no aggregates exist in this bucket.

export const CATALOGUE: CatalogueItem[] = [
  // ── Simple jobs (dedicated endpoints) ───────────────────────────────────────
  { id: "health-overview",  label: "Health Overview Report",           price: 30, type: "simple", jobType: "health-overview"    },
  { id: "medical-overview", label: "Medical Overview Report",          price: 75, type: "simple", jobType: "clinical-overview"  },
  { id: "longevity",        label: "Longevity Screener",               price: 30, type: "simple", jobType: "longevity-screener" },
  { id: "pgx",              label: "Medication Check (PGx)",           price: 25, type: "simple", jobType: "pgx"                },
  { id: "carrier-status",   label: "Family Planning (Carrier Status)", price: 25, type: "simple", jobType: "carrier-status"     },
  { id: "ancestry",         label: "Ancestry",                         price: 20, type: "simple", jobType: "ancestry", ancestryType: "ancestry" },
  { id: "mtdna",            label: "mtDNA Ancestry",                   price: 20, type: "simple", jobType: "ancestry", ancestryType: "mtdna"   },
  { id: "methylation",      label: "Methylation Pathway",              price: 25, type: "simple", jobType: "bio-chemistry" },
  { id: "detox",            label: "Detox Pathway",                    price: 25, type: "simple", jobType: "bio-chemistry" },
  { id: "histamine",        label: "Histamine Pathway",                price: 25, type: "simple", jobType: "bio-chemistry" },
  { id: "serotonin",        label: "Serotonin Pathway",                price: 25, type: "simple", jobType: "bio-chemistry" },
  { id: "dopamine",         label: "Dopamine Pathway",                 price: 25, type: "simple", jobType: "bio-chemistry" },

  // ── Report jobs (bulk /report-job/bulk-create/) ──────────────────────────────

  // Health: standard (individual reports) + aggregate/combined (summary reports).
  // showSelection=true because "Summary Only" vs "Reports Only" is useful here.
  {
    id: "health-reports",
    label: "Health Reports",
    price: 30,
    type: "report",
    reportTypes: ["standard", "aggregate", "combined"],
    listingType: "health",        // narrows to health-oriented listing bucket
    showSelection: true,
    note: "Summary + Individual",
  },

  // Traits: dedicated report_type — no listing_type filter needed.
  {
    id: "traits",
    label: "Traits",
    price: 10,
    type: "report",
    reportTypes: ["trait"],
    showSelection: false,
    note: "",
  },

  // Functional: aggregates + gene reports under the "functional" listing bucket.
  // No summary/individual split — always generate all.
  {
    id: "functional-reports",
    label: "Functional Reports",
    price: 30,
    type: "report",
    reportTypes: ["aggregate", "gene"],
    listingType: "functional",
    showSelection: false,
    note: "Summary + Genes + Biohacker",
  },

  // Medical: standard reports under the "medicinal" listing bucket.
  // No aggregates exist here — always generate all.
  {
    id: "medical-reports",
    label: "Medical Reports",
    price: 30,
    type: "report",
    reportTypes: ["standard"],
    listingType: "medicinal",
    showSelection: false,
    note: "Individual Reports",
  },
]

// ─── Bundles ──────────────────────────────────────────────────────────────────

export const BUNDLES: Bundle[] = [
  {
    id: "health",
    label: "Health Bundle",
    price: 50,
    itemIds: ["health-overview", "health-reports"],
    description: "Includes LTA & LSA",
  },
  {
    id: "functional",
    label: "Functional Bundle",
    price: 90,
    itemIds: ["functional-reports", "methylation", "detox", "histamine", "serotonin", "dopamine"],
  },
  {
    id: "medical",
    label: "Medical Bundle",
    price: 105,
    itemIds: ["medical-overview", "longevity", "pgx", "carrier-status", "medical-reports"],
  },
  {
    id: "ancestry-bundle",
    label: "Ancestry Bundle",
    price: 25,
    itemIds: ["ancestry", "mtdna", "traits"],
  },
  {
    id: "ultimate",
    label: "Ultimate Bundle",
    price: 155,
    itemIds: [
      "health-overview", "health-reports",
      "functional-reports", "methylation", "detox", "histamine", "serotonin", "dopamine",
      "medical-overview", "longevity", "pgx", "carrier-status", "medical-reports",
      "ancestry", "traits",
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns all catalogue item IDs that belong to a given bundle,
 * including the bundle's own simple-job items.
 */
export function getCatalogueIdsForBundle(bundleId: string): string[] {
  const bundle = BUNDLES.find(b => b.id === bundleId)
  return bundle ? bundle.itemIds : []
}

/**
 * Given a job's job_type and report_type (from the report summary),
 * returns the best matching catalogue item id for filtering purposes.
 */
export function guessCatalogueItemId(
  jobType: string,
  reportType?: string,
  listingType?: string,
): string | undefined {
  // Simple job types map 1:1 to catalogue item ids
  const directMap: Record<string, string> = {
    "health-overview":   "health-overview",
    "clinical-overview": "medical-overview",
    "longevity-screener":"longevity",
    "pgx":               "pgx",
    "carrier-status":    "carrier-status",
    "bio-chemistry":     "methylation", // any pathway; filter shows all pathway jobs
  }
  if (directMap[jobType]) return directMap[jobType]

  // For report-job types, match by report_type + listing_type
  if (jobType === "report-job" && reportType) {
    for (const item of CATALOGUE) {
      if (item.type !== "report") continue
      if (!item.reportTypes?.includes(reportType as ReportType)) continue
      if (item.listingType && listingType && item.listingType !== listingType) continue
      return item.id
    }
  }

  return undefined
}