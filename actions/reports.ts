"use server"

import { revalidatePath } from "next/cache"

const ENV_DOMAIN = process.env.SELFDECODE_ENV_DOMAIN || ""
const BASE_URL = `https://${ENV_DOMAIN}selfdecode.com`
const CLIENT_ID = process.env.SELFDECODE_CLIENT_ID
const CLIENT_SECRET = process.env.SELFDECODE_CLIENT_SECRET

async function getAccessToken() {
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
  return (await res.json()).access_token as string
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportJobStatus =
  | "init" | "profile_upserted" | "waiting_file_processing" | "file_processed"
  | "waiting_report_gen" | "report_generated" | "waiting_pdf" | "pdf_generated"
  | "failed_downloading_file" | "failed_uploading_file" | "failed_file_processing"
  | "failed_report_gen" | "failed_pdf"

export interface ReportJob {
  id: string
  status: ReportJobStatus
  desired_status: string
  profile_id: string
  report_id?: string
  report_name?: string       // enriched from report-summary lookup
  pdf_url: string | null
  error: string
  handling_failed: boolean
  created_at: string
  finished_at: string | null
  report_requested_at: string | null
  pdf_requested_at: string | null
}

export interface ReportSummary {
  id: string
  name: string
  report_type: string
  area: string[]
  is_deprecated: boolean
  summary?: string
}

export interface PaginatedReportJobs {
  jobs: ReportJob[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchAllRawJobs(profileId: string, token: string): Promise<ReportJob[]> {
  const res = await fetch(
    `${BASE_URL}/service/b2b-integrations/report-job/?profile_id=${profileId}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" }
  )
  if (!res.ok) throw new Error(`Failed to fetch report jobs: ${res.status}`)
  return res.json()
}

async function buildNameMap(token: string): Promise<Map<string, string>> {
  try {
    const res = await fetch(
      `${BASE_URL}/service/b2b-integrations/report-summary/`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        next: { revalidate: 300 }, // cache 5 min — report names rarely change
      }
    )
    if (!res.ok) return new Map()
    const summaries: ReportSummary[] = await res.json()
    return new Map(summaries.map(s => [s.id, s.name]))
  } catch {
    return new Map()
  }
}

function enrich(jobs: ReportJob[], nameMap: Map<string, string>): ReportJob[] {
  return jobs.map(job => ({
    ...job,
    report_name: job.report_id ? (nameMap.get(job.report_id) ?? undefined) : undefined,
  }))
}

// ─── Public actions ───────────────────────────────────────────────────────────

/** Initial server-side load — all jobs enriched with names */
export async function getReportJobs(profileId: string): Promise<ReportJob[]> {
  const token = await getAccessToken()
  const [jobs, nameMap] = await Promise.all([
    fetchAllRawJobs(profileId, token),
    buildNameMap(token),
  ])
  return enrich(jobs, nameMap)
}

/** Client-triggered refresh with pagination */
export async function getReportJobsPaginated(
  profileId: string,
  page: number = 1,
  pageSize: number = 15
): Promise<PaginatedReportJobs> {
  const token = await getAccessToken()
  const [allJobs, nameMap] = await Promise.all([
    fetchAllRawJobs(profileId, token),
    buildNameMap(token),
  ])
  const enriched = enrich(allJobs, nameMap)
  const total = enriched.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    jobs: enriched.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

export async function generateAllReports(
  profileId: string,
  desiredStatus: "report_generated" | "pdf_generated" = "pdf_generated"
): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(
    `${BASE_URL}/service/b2b-integrations/report-job/generate-all/`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ profile_id: profileId, desired_status: desiredStatus }),
      cache: "no-store",
    }
  )
  if (!res.ok) throw new Error(`Failed to generate all reports: ${await res.text()}`)
  revalidatePath(`/profiles/${profileId}`)
}

export async function createBulkReportJobs(
  profileId: string,
  reportIds: string[],
  desiredStatus: "report_generated" | "pdf_generated" = "pdf_generated"
): Promise<ReportJob[]> {
  const token = await getAccessToken()
  const res = await fetch(
    `${BASE_URL}/service/b2b-integrations/report-job/bulk-create/`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ profile_id: profileId, report_ids: reportIds, desired_status: desiredStatus }),
      cache: "no-store",
    }
  )
  if (!res.ok) throw new Error(`Failed to bulk create report jobs: ${await res.text()}`)
  revalidatePath(`/profiles/${profileId}`)
  return res.json()
}

export async function searchReports(query: string): Promise<ReportSummary[]> {
  const token = await getAccessToken()
  const params = new URLSearchParams()
  if (query) params.set("name", query)
  const res = await fetch(
    `${BASE_URL}/service/b2b-integrations/report-summary/?${params}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" }
  )
  if (!res.ok) throw new Error(`Failed to search reports: ${res.status}`)
  return res.json()
}