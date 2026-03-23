"use server"

import { revalidatePath } from "next/cache"
import {
  CATALOGUE,
  BUNDLES,
  type SimpleJobType,
  type AnyJob,
  type PaginatedJobs,
  type ReportSummary,
  type ReportType,
  guessCatalogueItemId,
} from "@/lib/reports-catalogue"

const ENV_DOMAIN = process.env.SELFDECODE_ENV_DOMAIN || ""
const BASE_URL = `https://${ENV_DOMAIN}selfdecode.com`
const CLIENT_ID = process.env.SELFDECODE_CLIENT_ID
const CLIENT_SECRET = process.env.SELFDECODE_CLIENT_SECRET
const B2B = `${BASE_URL}/service/b2b-integrations`

// ─── Shared Configurations ────────────────────────────────────────────────────

const DEFAULT_PDF_CONFIG = {
  white_labelled: true,
  company_profile: {
    professional_name: "NutriGenix",
    company_name: "NutriGenix",
    email: "milad.mansoori@nutrigenix.ae",
    address: "Meydan, Dubai.",
    logo: "https://health-report-dashboard.vercel.app/logo.png",
  },
}

const SIMPLE_ENDPOINTS: Record<SimpleJobType, string> = {
  "health-overview":    `${B2B}/health-overview-job/`,
  "clinical-overview":  `${B2B}/clinical-overview-job/`,
  "longevity-screener": `${B2B}/longevity-screener-job/`,
  "pgx":                `${B2B}/pgx-job/`,
  "carrier-status":     `${B2B}/carrier-status-job/`,
  "ancestry":           `${B2B}/ancestry-job/`,
  "bio-chemistry":      `${B2B}/bio-chemistry-job/`,
}

export type ReportSelection = "all" | "summary_only" | "report_only"

// ─── Auth & Helpers ───────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/service/health-analysis/accounts/user/openid/token/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    }
  )
  if (!res.ok) throw new Error("Failed to get access token")
  return (await res.json()).access_token
}

async function apiPost(url: string, token: string, body: object): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}: ${await res.text()}`)
  return res.json()
}

/**
 * Fetches the full /report-summary/ list (cached for 5 min) and returns it.
 * All report_type-based filtering happens in-memory from this single list.
 */
async function fetchAllReportSummaries(token: string): Promise<ReportSummary[]> {
  const res = await fetch(`${B2B}/report-summary/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  return res.json()
}

/**
 * Builds a Map<reportId, ReportSummary> for quick lookup by id.
 */
async function buildSummaryMap(token: string): Promise<Map<string, ReportSummary>> {
  try {
    const list = await fetchAllReportSummaries(token)
    return new Map(list.map(s => [s.id, s]))
  } catch {
    return new Map()
  }
}

/**
 * Filters the full summary list for a catalogue item based on its
 * reportTypes + listingType fields, then applies the optional selection
 * (summary_only / report_only) for items that support it.
 *
 * "Summary" reports = aggregate or combined report_types.
 * "Individual" reports = standard, trait, or gene report_types.
 */
function filterSummaries(
  all: ReportSummary[],
  reportTypes: ReportType[],
  listingType: string | undefined,
  selection: ReportSelection,
  showSelection: boolean,
): ReportSummary[] {
  let results = all.filter(s => {
    if (s.is_deprecated) return false
    if (!reportTypes.includes(s.report_type as ReportType)) return false
    if (listingType && s.listing_type !== listingType) return false
    return true
  })

  if (showSelection) {
    if (selection === "summary_only") {
      results = results.filter(s =>
        s.report_type === "aggregate" || s.report_type === "combined"
      )
    } else if (selection === "report_only") {
      results = results.filter(s =>
        s.report_type !== "aggregate" && s.report_type !== "combined"
      )
    }
  }

  return results
}

function normalize(
  raw: any,
  jobType: string,
  jobLabel: string,
  summaryMap?: Map<string, ReportSummary>,
): AnyJob {
  let label = jobLabel
  if (raw.ancestry_type === "mtdna") label = "mtDNA Ancestry"
  else if (raw.ancestry_type === "ancestry") label = "Ancestry"

  const summary = raw.report_id ? summaryMap?.get(raw.report_id) : undefined

  return {
    id: raw.id,
    status: raw.status ?? "unknown",
    desired_status: raw.desired_status,
    profile_id: raw.profile_id,
    report_id: raw.report_id,
    report_name: summary?.name,
    job_type: jobType,
    job_label: label,
    catalogue_item_id: guessCatalogueItemId(jobType, summary?.report_type, summary?.listing_type),
    pdf_url: raw.pdf_url ?? null,
    error: raw.error,
    handling_failed: raw.handling_failed,
    created_at: raw.created_at,
    finished_at: raw.finished_at ?? null,
  }
}

async function listJobs(
  endpoint: string,
  profileId: string,
  token: string,
  jobType: string,
  label: string,
  summaryMap?: Map<string, ReportSummary>,
): Promise<AnyJob[]> {
  try {
    const res = await fetch(`${endpoint}?profile_id=${profileId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    const arr = Array.isArray(data) ? data : (data.results ?? [])
    return arr.map((j: any) => normalize(j, jobType, label, summaryMap))
  } catch {
    return []
  }
}

// ─── Fetch all jobs ───────────────────────────────────────────────────────────

export async function getAllJobs(profileId: string): Promise<AnyJob[]> {
  const token = await getAccessToken()
  const summaryMap = await buildSummaryMap(token)

  const results = await Promise.all([
    listJobs(`${B2B}/report-job/`,                    profileId, token, "report-job",        "Report",                          summaryMap),
    listJobs(SIMPLE_ENDPOINTS["health-overview"],     profileId, token, "health-overview",   "Health Overview Report"),
    listJobs(SIMPLE_ENDPOINTS["clinical-overview"],   profileId, token, "clinical-overview", "Medical Overview Report"),
    listJobs(SIMPLE_ENDPOINTS["longevity-screener"],  profileId, token, "longevity-screener","Longevity Screener"),
    listJobs(SIMPLE_ENDPOINTS["pgx"],                 profileId, token, "pgx",               "Medication Check (PGx)"),
    listJobs(SIMPLE_ENDPOINTS["carrier-status"],      profileId, token, "carrier-status",    "Family Planning (Carrier Status)"),
    listJobs(SIMPLE_ENDPOINTS["ancestry"],            profileId, token, "ancestry",          "Ancestry"),
    listJobs(SIMPLE_ENDPOINTS["bio-chemistry"],       profileId, token, "bio-chemistry",     "Pathway Report"),
  ])

  return results.flat().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export async function getAllJobsPaginated(
  profileId: string,
  page = 1,
  pageSize = 15,
): Promise<PaginatedJobs> {
  const all = await getAllJobs(profileId)
  const total = all.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  return {
    jobs: all.slice((safePage - 1) * pageSize, safePage * pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export async function generateItem(
  profileId: string,
  itemId: string,
  desiredStatus: "report_generated" | "pdf_generated" = "pdf_generated",
  selection: ReportSelection = "all",
): Promise<void> {
  const item = CATALOGUE.find(c => c.id === itemId)
  if (!item) throw new Error(`Unknown catalogue item: ${itemId}`)
  const token = await getAccessToken()

  if (item.type === "simple") {
    const payload: any = {
      profile_id: profileId,
      desired_status: desiredStatus,
      pdf_config: DEFAULT_PDF_CONFIG,
    }
    if (item.jobType === "bio-chemistry") payload.bio_chemistry_report_id = item.id
    if (item.ancestryType) payload.ancestry_type = item.ancestryType
    await apiPost(SIMPLE_ENDPOINTS[item.jobType!], token, payload)
  } else {
    // type === "report": filter in-memory by report_type + listingType
    const all = await fetchAllReportSummaries(token)
    const active = filterSummaries(
      all,
      item.reportTypes!,
      item.listingType,
      selection,
      item.showSelection ?? false,
    )
    if (!active.length) {
      throw new Error(
        `No reports found for "${item.label}" (types: ${item.reportTypes?.join(", ")})` +
        (item.listingType ? ` listing: ${item.listingType}` : "") +
        ` selection: ${selection}`
      )
    }
    await apiPost(`${B2B}/report-job/bulk-create/`, token, {
      profile_id: profileId,
      report_ids: active.map(s => s.id),
      desired_status: desiredStatus,
      pdf_config: DEFAULT_PDF_CONFIG,
    })
  }

  revalidatePath(`/profiles/${profileId}`)
}

export async function generateBundle(
  profileId: string,
  bundleId: string,
  desiredStatus: "report_generated" | "pdf_generated" = "pdf_generated",
): Promise<{ succeeded: string[]; failed: Array<{ label: string; error: string }> }> {
  const bundle = BUNDLES.find(b => b.id === bundleId)
  if (!bundle) throw new Error(`Unknown bundle: ${bundleId}`)
  const token = await getAccessToken()

  // Fetch summaries once for all report-type items in this bundle
  const allSummaries = await fetchAllReportSummaries(token)

  const seen = new Set<string>()
  const succeeded: string[] = []
  const failed: Array<{ label: string; error: string }> = []

  await Promise.all(
    bundle.itemIds.map(async itemId => {
      const item = CATALOGUE.find(c => c.id === itemId)
      if (!item) return

      // Dedupe key: for report items, use type+listingType to avoid duplicate bulk calls
      const dedupeKey = item.type === "simple"
        ? item.id
        : `report:${item.reportTypes?.join(",")}:${item.listingType ?? ""}`

      if (seen.has(dedupeKey)) { succeeded.push(item.label); return }
      seen.add(dedupeKey)

      try {
        if (item.type === "simple") {
          const payload: any = {
            profile_id: profileId,
            desired_status: desiredStatus,
            pdf_config: DEFAULT_PDF_CONFIG,
          }
          if (item.jobType === "bio-chemistry") payload.bio_chemistry_report_id = item.id
          if (item.ancestryType) payload.ancestry_type = item.ancestryType
          await apiPost(SIMPLE_ENDPOINTS[item.jobType!], token, payload)
        } else {
          const active = filterSummaries(
            allSummaries,
            item.reportTypes!,
            item.listingType,
            "all",   // bundles always generate all reports
            false,
          )
          if (!active.length) throw new Error("No reports found for bundle generation")
          await apiPost(`${B2B}/report-job/bulk-create/`, token, {
            profile_id: profileId,
            report_ids: active.map(s => s.id),
            desired_status: desiredStatus,
            pdf_config: DEFAULT_PDF_CONFIG,
          })
        }
        succeeded.push(item.label)
      } catch (e) {
        failed.push({ label: item.label, error: e instanceof Error ? e.message : "Unknown error" })
      }
    })
  )

  revalidatePath(`/profiles/${profileId}`)
  return { succeeded, failed }
}

export async function searchReports(query: string, reportType?: string): Promise<ReportSummary[]> {
  const token = await getAccessToken()
  const all = await fetchAllReportSummaries(token)
  const q = query.trim().toLowerCase()
  return all.filter(r => {
    if (r.is_deprecated) return false
    if (q && !r.name.toLowerCase().includes(q)) return false
    if (reportType && r.report_type !== reportType) return false
    return true
  })
}

export async function createBulkReportJobs(
  profileId: string,
  reportIds: string[],
  desiredStatus: "report_generated" | "pdf_generated" = "pdf_generated",
) {
  const token = await getAccessToken()
  const result = await apiPost(`${B2B}/report-job/bulk-create/`, token, {
    profile_id: profileId,
    report_ids: reportIds,
    desired_status: desiredStatus,
    pdf_config: DEFAULT_PDF_CONFIG,
  })
  revalidatePath(`/profiles/${profileId}`)
  return result
}