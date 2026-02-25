"use server"

import { revalidatePath } from "next/cache"

const ENV_DOMAIN = process.env.SELFDECODE_ENV_DOMAIN || ""
const BASE_URL = `https://${ENV_DOMAIN}selfdecode.com`
const CLIENT_ID = process.env.SELFDECODE_CLIENT_ID
const CLIENT_SECRET = process.env.SELFDECODE_CLIENT_SECRET
const B2B = `${BASE_URL}/service/b2b-integrations`

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type DnaKitJobStatus =
  | "shipped"
  | "registered"
  | "received_by_lab"
  | "analyzed_by_lab"
  | "waiting_reanalysis"
  | "processing_dna_file"
  | "completed"
  | "failed"
  | "cancelled"

export interface DnaKitJob {
  id: string
  user_id: string
  status: DnaKitJobStatus
  handling_failed: boolean
  created_at: string
  finished_at: string | null
  received_by_lab_at: string | null
  analyzed_by_lab_at: string | null
  error: string
  sample_id: string
  profile_id: string
}

// ─── List jobs for a profile ──────────────────────────────────────────────────

export async function getDnaKitJobs(profileId: string): Promise<DnaKitJob[]> {
  const token = await getAccessToken()
  const res = await fetch(`${B2B}/dna-kit-job/?profile_id=${profileId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to fetch DNA kit jobs: ${res.status}`)
  const data = await res.json()
  const arr: DnaKitJob[] = Array.isArray(data) ? data : (data.results ?? [])
  return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// ─── Look up a sample_id before registering ───────────────────────────────────

export async function lookupSampleId(sampleId: string): Promise<DnaKitJob | null> {
  const token = await getAccessToken()
  const res = await fetch(
    `${B2B}/dna-kit-job/sample-id/${encodeURIComponent(sampleId)}/`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Lookup failed: ${res.status}`)
  return res.json()
}

// ─── Register a kit ───────────────────────────────────────────────────────────

export async function registerDnaKit(
  profileId: string,
  sampleId: string
): Promise<DnaKitJob> {
  const token = await getAccessToken()
  const res = await fetch(`${B2B}/dna-kit-job/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ profile_id: profileId, sample_id: sampleId }),
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Registration failed (${res.status}): ${text}`)
  }
  revalidatePath(`/profiles/${profileId}`)
  return res.json()
}