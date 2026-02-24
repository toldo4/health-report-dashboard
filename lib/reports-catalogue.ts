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

export interface CatalogueItem {
  id: string
  label: string
  price: number
  type: "simple" | "report"
  jobType?: SimpleJobType
  searchQuery?: string
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
  report_type: string
  area: string[]
  is_deprecated: boolean
}

export const CATALOGUE: CatalogueItem[] = [
  { id: "health-overview",    label: "Health Overview Report",              price: 30, type: "simple", jobType: "health-overview"    },
  { id: "medical-overview",   label: "Medical Overview Report",             price: 75, type: "simple", jobType: "clinical-overview"  },
  { id: "longevity",          label: "Longevity Screener",                  price: 30, type: "simple", jobType: "longevity-screener" },
  { id: "pgx",                label: "Medication Check (PGx)",              price: 25, type: "simple", jobType: "pgx"                },
  { id: "carrier-status",     label: "Family Planning (Carrier Status)",    price: 25, type: "simple", jobType: "carrier-status"     },
  { id: "ancestry",           label: "Ancestry",                            price: 20, type: "simple", jobType: "ancestry",          note: "" },
  { id: "methylation",        label: "Methylation Pathway",                 price: 25, type: "simple", jobType: "bio-chemistry"      },
  { id: "detox",              label: "Detox Pathway",                       price: 25, type: "simple", jobType: "bio-chemistry"      },
  { id: "histamine",          label: "Histamine Pathway",                   price: 25, type: "simple", jobType: "bio-chemistry"      },
  { id: "serotonin",          label: "Serotonin Pathway",                   price: 25, type: "simple", jobType: "bio-chemistry"      },
  { id: "dopamine",           label: "Dopamine Pathway",                    price: 25, type: "simple", jobType: "bio-chemistry"      },
  { id: "health-reports",     label: "Health Reports",                      price: 30, type: "report", searchQuery: "health",        note: "Summary + Individual"           },
  { id: "functional-reports", label: "Functional Reports",                  price: 30, type: "report", searchQuery: "functional",    note: "Summary + Genes + Biohacker"    },
  { id: "medical-reports",    label: "Medical Reports",                     price: 30, type: "report", searchQuery: "medical",       note: "Summary + Individual"           },
  { id: "traits",             label: "Traits",                              price: 10, type: "report", searchQuery: "traits",        note: ""                },
]

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
    itemIds: ["ancestry", "traits"],
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