"use server"

import { revalidatePath } from "next/cache"
import {
  CATALOGUE,
  BUNDLES,
  type SimpleJobType,
  type AnyJob,
  type PaginatedJobs,
  type ReportSummary,
} from "@/lib/reports-catalogue"
import { log } from "console"

const ENV_DOMAIN = process.env.SELFDECODE_ENV_DOMAIN || ""
const BASE_URL = `https://${ENV_DOMAIN}selfdecode.com`
const CLIENT_ID = process.env.SELFDECODE_CLIENT_ID
const CLIENT_SECRET = process.env.SELFDECODE_CLIENT_SECRET
const B2B = `${BASE_URL}/service/b2b-integrations`

// ─── Shared Configurations ────────────────────────────────────────────────────

const DEFAULT_PDF_CONFIG = {
  white_labelled: true,
  company_profile: {
    professional_name: "NutriGenix", // Primary name displayed
    company_name: "NutriGenix",      // Secondary name
    email: "milad.mansoori@nutrigenix.ae",
    address: "Meydan, Dubai.",
    logo: "https://health-report-dashboard.vercel.app/logo.png",
  }
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

// ─── Auth & Helpers ───────────────────────────────────────────────

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

async function buildNameMap(token: string): Promise<Map<string, string>> {
  try {
    const res = await fetch(`${B2B}/report-summary/`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate: 300 },
    })
    if (!res.ok) return new Map()
    const list: ReportSummary[] = await res.json()
    return new Map(list.map(s => [s.id, s.name]))
  } catch {
    return new Map()
  }
}

function normalize(raw: any, jobType: string, jobLabel: string, nameMap?: Map<string, string>): AnyJob {
  return {
    id: raw.id,
    status: raw.status ?? "unknown",
    desired_status: raw.desired_status,
    profile_id: raw.profile_id,
    report_id: raw.report_id,
    report_name: raw.report_id && nameMap ? (nameMap.get(raw.report_id) ?? undefined) : undefined,
    job_type: jobType,
    job_label: jobLabel,
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
  nameMap?: Map<string, string>
): Promise<AnyJob[]> {
  try {
    const res = await fetch(`${endpoint}?profile_id=${profileId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    const arr = Array.isArray(data) ? data : (data.results ?? [])
    return arr.map((j: any) => normalize(j, jobType, label, nameMap))
  } catch {
    return []
  }
}

// ─── Fetch all jobs ───────────────────────────────────────────────

export async function getAllJobs(profileId: string): Promise<AnyJob[]> {
  const token = await getAccessToken()
  const nameMap = await buildNameMap(token)

  const results = await Promise.all([
    listJobs(`${B2B}/report-job/`,                       profileId, token, "report-job",        "Report",                          nameMap),
    listJobs(SIMPLE_ENDPOINTS["health-overview"],        profileId, token, "health-overview",   "Health Overview Report"),
    listJobs(SIMPLE_ENDPOINTS["clinical-overview"],      profileId, token, "clinical-overview", "Medical Overview Report"),
    listJobs(SIMPLE_ENDPOINTS["longevity-screener"],     profileId, token, "longevity-screener","Longevity Screener"),
    listJobs(SIMPLE_ENDPOINTS["pgx"],                    profileId, token, "pgx",               "Medication Check (PGx)"),
    listJobs(SIMPLE_ENDPOINTS["carrier-status"],         profileId, token, "carrier-status",    "Family Planning (Carrier Status)"),
    listJobs(SIMPLE_ENDPOINTS["ancestry"],               profileId, token, "ancestry",          "Ancestry"),
    listJobs(SIMPLE_ENDPOINTS["bio-chemistry"],          profileId, token, "bio-chemistry",     "Pathway Report"),
  ])

  return results.flat().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export async function getAllJobsPaginated(
  profileId: string,
  page = 1,
  pageSize = 15
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
  desiredStatus: "report_generated" | "pdf_generated" = "pdf_generated"
): Promise<void> {
  const item = CATALOGUE.find(c => c.id === itemId)
  if (!item) throw new Error(`Unknown catalogue item: ${itemId}`)
  const token = await getAccessToken()

  if (item.type === "simple") {
    // 1. Build the base payload
    const payload: any = {
      profile_id: profileId,
      desired_status: desiredStatus,
      pdf_config: DEFAULT_PDF_CONFIG
    }
    
    // 2. Conditionally add the bio_chemistry_report_id if needed
    if (item.jobType === "bio-chemistry") {
      payload.bio_chemistry_report_id = item.id // e.g. "methylation", "detox"
    }

    await apiPost(SIMPLE_ENDPOINTS[item.jobType!], token, payload)
  } else {
    const res = await fetch(
      `${B2B}/report-summary/?name=${encodeURIComponent(item.searchQuery!)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" }
    )
    if (!res.ok) throw new Error(`Failed to search reports: ${res.status}`)
    const summaries: ReportSummary[] = await res.json()
    const active = summaries.filter(s => !s.is_deprecated)
    if (!active.length) throw new Error(`No reports found for "${item.searchQuery}"`)
    await apiPost(`${B2B}/report-job/bulk-create/`, token, {
      profile_id: profileId,
      report_ids: active.map(s => s.id),
      desired_status: desiredStatus,
      pdf_config: DEFAULT_PDF_CONFIG
    })
  }

  revalidatePath(`/profiles/${profileId}`)
}

export async function generateBundle(
  profileId: string,
  bundleId: string,
  desiredStatus: "report_generated" | "pdf_generated" = "pdf_generated"
): Promise<{ succeeded: string[]; failed: Array<{ label: string; error: string }> }> {
  const bundle = BUNDLES.find(b => b.id === bundleId)
  if (!bundle) throw new Error(`Unknown bundle: ${bundleId}`)
  const token = await getAccessToken()

  const seen = new Set<string>()
  const succeeded: string[] = []
  const failed: Array<{ label: string; error: string }> = []

  await Promise.all(
    bundle.itemIds.map(async (itemId) => {
      const item = CATALOGUE.find(c => c.id === itemId)
      if (!item) return
      
      // FIX: Use item.id as dedupe key for simple types so multiple bio-chemistry jobs don't skip each other
      const dedupeKey = item.type === "simple" ? item.id : `report:${item.searchQuery}`
      if (seen.has(dedupeKey)) { succeeded.push(item.label); return }
      seen.add(dedupeKey)

      try {
        if (item.type === "simple") {
          const payload: any = {
            profile_id: profileId,
            desired_status: desiredStatus,
            pdf_config: DEFAULT_PDF_CONFIG
          }

          if (item.jobType === "bio-chemistry") {
            payload.bio_chemistry_report_id = item.id
          }

          await apiPost(SIMPLE_ENDPOINTS[item.jobType!], token, payload)
        } else {
          const res = await fetch(
            `${B2B}/report-summary/?name=${encodeURIComponent(item.searchQuery!)}`,
            { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" }
          )
          const summaries: ReportSummary[] = res.ok ? await res.json() : []
          const active = summaries.filter(s => !s.is_deprecated)
          if (!active.length) throw new Error("No reports found")
          await apiPost(`${B2B}/report-job/bulk-create/`, token, {
            profile_id: profileId,
            report_ids: active.map(s => s.id),
            desired_status: desiredStatus,
            pdf_config: DEFAULT_PDF_CONFIG
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

export async function searchReports(query: string): Promise<ReportSummary[]> {
  const token = await getAccessToken()
  const params = new URLSearchParams()
  if (query) params.set("name", query)
  const res = await fetch(`${B2B}/report-summary/?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to search reports: ${res.status}`)
  const all: ReportSummary[] = await res.json()
  return all.filter(r => !r.is_deprecated)
}

export async function createBulkReportJobs(
  profileId: string,
  reportIds: string[],
  desiredStatus: "report_generated" | "pdf_generated" = "pdf_generated"
) {
  const token = await getAccessToken()
  const result = await apiPost(`${B2B}/report-job/bulk-create/`, token, {
    profile_id: profileId,
    report_ids: reportIds,
    desired_status: desiredStatus,
    pdf_config: DEFAULT_PDF_CONFIG
  })
  revalidatePath(`/profiles/${profileId}`)
  return result
}