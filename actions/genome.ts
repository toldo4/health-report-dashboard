"use server"

import { revalidatePath } from "next/cache"

const ENV_DOMAIN = process.env.SELFDECODE_ENV_DOMAIN || ""
const BASE_URL = `https://${ENV_DOMAIN}selfdecode.com`
const CLIENT_ID = process.env.SELFDECODE_CLIENT_ID
const CLIENT_SECRET = process.env.SELFDECODE_CLIENT_SECRET

async function getAccessToken() {
  const authUrl = `${BASE_URL}/service/health-analysis/accounts/user/openid/token/`
  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  })
  if (!response.ok) throw new Error("Failed to get access token")
  const data = await response.json()
  return data.access_token as string
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type GenomeJobStatus =
  | "waiting_file_processing"
  | "file_processed"
  | "failed_file_processing"

export interface GenomeFileJob {
  id: string
  profile_id: string
  user_id: string
  status: GenomeJobStatus
  file_provider: string | null
  file_chipset: string | null
  error: string | null
  created_at: string
  finished_at: string | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Step 1: Ask the API for a presigned S3 URL.
 * Returns { url, fields, file_id }
 */
export async function getPresignedUploadUrl(): Promise<{
  url: string
  fields: Record<string, string>
  file_id: string
}> {
  const token = await getAccessToken()
  const res = await fetch(
    `${BASE_URL}/service/b2b-integrations/genome-file/upload-file/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get presigned URL: ${text}`)
  }
  return res.json()
}

/**
 * Step 3: After the client has uploaded the file directly to S3,
 * create the genome-file-job to kick off processing.
 */
export async function createGenomeFileJob(
  profileId: string,
  fileId: string
): Promise<GenomeFileJob> {
  const token = await getAccessToken()
  const res = await fetch(
    `${BASE_URL}/service/b2b-integrations/genome-file-job/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ profile_id: profileId, file_id: fileId }),
      cache: "no-store",
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create genome job: ${text}`)
  }
  revalidatePath(`/profiles/${profileId}`)
  return res.json()
}

/**
 * Get a presigned download URL for the genome file associated with a profile.
 * Returns the URL string, or null if not found.
 */
export async function getGenomeDownloadUrl(profileId: string): Promise<string | null> {
  const token = await getAccessToken()
  const res = await fetch(
    `${BASE_URL}/service/b2b-integrations/genome-file/download/profile/${profileId}/`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to get genome download URL")
  const data: { download_url: string } = await res.json()
  return data.download_url
}

/**
 * Fetch all genome file jobs for a profile.
 */
export async function getGenomeJobs(profileId: string): Promise<GenomeFileJob[]> {
  const token = await getAccessToken()
  const res = await fetch(
    `${BASE_URL}/service/b2b-integrations/genome-file-job/?profile_id=${profileId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to fetch genome jobs: ${text}`)
  }
  return res.json()
}