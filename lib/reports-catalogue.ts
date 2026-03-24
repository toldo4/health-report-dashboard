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

export type ReportType = "standard" | "trait" | "gene" | "aggregate" | "combined" | "non-genetic"

/**
 * Classification table (listing_type is the PRIMARY key, report_type is a guard):
 *
 * ┌──────────────────┬──────────────┬────────────────────────┬─────────────────────────────────┐
 * │ Catalogue Item   │ Subtype      │ listing_type           │ report_type guard                │
 * ├──────────────────┼──────────────┼────────────────────────┼─────────────────────────────────┤
 * │ Health Reports   │ Summary      │ category               │ (any)                           │
 * │                  │ Individual   │ medicinal              │ NOT gene                        │
 * ├──────────────────┼──────────────┼────────────────────────┼─────────────────────────────────┤
 * │ Functional       │ Summary      │ functional             │ (any)                           │
 * │                  │ Genes        │ NOT disease            │ gene                            │
 * │                  │ Biohacker    │ experimental           │ (any)                           │
 * ├──────────────────┼──────────────┼────────────────────────┼─────────────────────────────────┤
 * │ Medical Reports  │ Summary      │ disease                │ aggregate                       │
 * │                  │ Individual   │ disease                │ NOT aggregate, NOT gene         │
 * ├──────────────────┼──────────────┼────────────────────────┼─────────────────────────────────┤
 * │ Traits           │ —            │ non-medicinal          │ (any)                           │
 * └──────────────────┴──────────────┴────────────────────────┴─────────────────────────────────┘
 *
 * Note: Functional "Genes" excludes listing_type=disease to avoid overlap with Medical.
 *       Functional "Biohacker" (experimental) and "Genes" (experimental) both roll into
 *       the single "Functional Reports" catalogue item.
 */

/**
 * A single match condition for a report-type catalogue item.
 * A report matches if ALL defined conditions are satisfied (AND logic within a rule).
 */
export interface ReportMatchRule {
  listingTypes?: string[]
  excludeListingTypes?: string[]
  reportTypes?: ReportType[]
  excludeReportTypes?: ReportType[]
}

export interface CatalogueItem {
  id: string
  label: string
  price: number
  type: "simple" | "report"
  jobType?: SimpleJobType
  ancestryType?: "ancestry" | "mtdna"
  /**
   * For type="report" items: one or more match rules.
   * A report is included if it satisfies ANY rule (OR between rules, AND within a rule).
   */
  rules?: ReportMatchRule[]
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
  report_image?: string | null   // thumbnail icon from /report-summary/ image field
  job_type: string
  job_label: string
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
  image?: string
  illustration?: string
  is_deprecated: boolean
  listing_type?: string
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

export const CATALOGUE: CatalogueItem[] = [
  // ── Simple jobs ──────────────────────────────────────────────────────────────
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

  // ── Report jobs ──────────────────────────────────────────────────────────────

  // Health Reports
  //   Summary:    listing_type=category (any report_type)
  //   Individual: listing_type=medicinal, report_type != gene
  {
    id: "health-reports",
    label: "Health Reports",
    price: 30,
    type: "report",
    rules: [
      { listingTypes: ["category"] },
      { listingTypes: ["medicinal"], excludeReportTypes: ["gene"] },
    ],
    showSelection: true,
    note: "Summary + Individual",
  },

  // Traits: listing_type=non-medicinal (any report_type)
  {
    id: "traits",
    label: "Traits",
    price: 10,
    type: "report",
    rules: [
      { listingTypes: ["non-medicinal"] },
    ],
    showSelection: false,
    note: "",
  },

  // Functional Reports
  //   Summary:   listing_type=functional (any report_type)
  //   Genes:     report_type=gene, listing_type != disease
  //   Biohacker: listing_type=experimental (any report_type)
  {
    id: "functional-reports",
    label: "Functional Reports",
    price: 30,
    type: "report",
    rules: [
      { listingTypes: ["functional"] },
      { reportTypes: ["gene"], excludeListingTypes: ["disease"] },
      { listingTypes: ["experimental"] },
    ],
    showSelection: false,
    note: "Summary + Genes + Biohacker",
  },

  // Medical Reports
  //   Summary:    listing_type=disease, report_type=aggregate
  //   Individual: listing_type=disease, report_type != aggregate AND != gene
  {
    id: "medical-reports",
    label: "Medical Reports",
    price: 30,
    type: "report",
    rules: [
      { listingTypes: ["disease"], reportTypes: ["aggregate"] },
      { listingTypes: ["disease"], reportTypes: ["gene"] },
      { listingTypes: ["disease"], excludeReportTypes: ["aggregate", "gene"] },
    ],
    showSelection: false,
    note: "Summary + Individual",
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

// ─── Matching helpers ─────────────────────────────────────────────────────────

export function matchesRule(report: ReportSummary, rule: ReportMatchRule): boolean {
  if (rule.listingTypes && !rule.listingTypes.includes(report.listing_type ?? ""))
    return false
  if (rule.excludeListingTypes && rule.excludeListingTypes.includes(report.listing_type ?? ""))
    return false
  if (rule.reportTypes && !rule.reportTypes.includes(report.report_type as ReportType))
    return false
  if (rule.excludeReportTypes && rule.excludeReportTypes.includes(report.report_type as ReportType))
    return false
  return true
}

export function matchesCatalogueItem(report: ReportSummary, item: CatalogueItem): boolean {
  if (!item.rules?.length) return false
  return item.rules.some(rule => matchesRule(report, rule))
}

export function isSummaryReport(report: ReportSummary): boolean {
  return (report.report_type === "aggregate" || report.report_type === "combined")
    || report.listing_type === "category"
}

export function getCatalogueIdsForBundle(bundleId: string): string[] {
  const bundle = BUNDLES.find(b => b.id === bundleId)
  return bundle ? bundle.itemIds : []
}

export function guessCatalogueItemId(
  jobType: string,
  report?: ReportSummary,
): string | undefined {
  const directMap: Record<string, string> = {
    "health-overview":    "health-overview",
    "clinical-overview":  "medical-overview",
    "longevity-screener": "longevity",
    "pgx":                "pgx",
    "carrier-status":     "carrier-status",
    "bio-chemistry":      "methylation",
  }
  if (directMap[jobType]) return directMap[jobType]
  if (jobType === "report-job" && report) {
    for (const item of CATALOGUE) {
      if (item.type !== "report") continue
      if (matchesCatalogueItem(report, item)) return item.id
    }
  }
  return undefined
}