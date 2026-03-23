"use server"

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

export interface OpenTargetGene {
  slug: string
  open_target_description: string
  sd_description: string
  sd_summary: string
  sd_ghr_function: string
  sd_recommendation: string
}

export interface SNPFrequencyTable {
  gnomad_afr?: number
  gnomad_amr?: number
  gnomad_asj?: number
  gnomad_eas?: number
  gnomad_fin?: number
  gnomad_nfe?: number
  gnomad_oth?: number
  gnomad_nfe_est?: number
  gnomad_nfe_nwe?: number
  gnomad_nfe_onf?: number
  gnomad_nfe_seu?: number
}

export interface SNPSummary {
  rsid: string
  alts: string[]
  variant_ids: string[]
  frequency_tables: SNPFrequencyTable[]
  overall_score: number
  gene_slug: string
}

export interface SNPSummaryPage {
  count: number
  next: string | null
  previous: string | null
  results: SNPSummary[]
}

export interface SNPGenotype {
  profile_id: string
  rsid: string
  genotypes: string[]
  variant_ids: string[]
}

export interface GenePageData {
  gene: OpenTargetGene
  snpPage: SNPSummaryPage
  genotypes: SNPGenotype[]
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getGene(slug: string): Promise<OpenTargetGene | null> {
  const token = await getAccessToken()
  const res = await fetch(`${B2B}/open-target-gene/?slug=${encodeURIComponent(slug)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) return null
  const data: OpenTargetGene[] = await res.json()
  return data[0] ?? null
}

export async function getGeneSNPs(
  geneSlug: string,
  page = 1,
  pageSize = 20
): Promise<SNPSummaryPage> {
  const token = await getAccessToken()
  const res = await fetch(
    `${B2B}/open-target-snp-summary/?gene_slug=${encodeURIComponent(geneSlug)}&page=${page}&page_size=${pageSize}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    }
  )
  if (!res.ok) throw new Error(`Failed to fetch SNPs: ${res.status}`)
  return res.json()
}

export async function getGenotypes(
  profileId: string,
  rsids: string[]
): Promise<SNPGenotype[]> {
  if (rsids.length === 0) return []
  const token = await getAccessToken()

  const chunks: string[][] = []
  for (let i = 0; i < rsids.length; i += 75) {
    chunks.push(rsids.slice(i, i + 75))
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch(
        `${B2B}/genotype/?profile_id=${profileId}&rsid=${chunk.join(",")}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        }
      )
      if (!res.ok) return []
      return res.json() as Promise<SNPGenotype[]>
    })
  )

  return results.flat()
}

export async function loadGenePageData(
  geneSlug: string,
  profileId: string,
  page = 1
): Promise<GenePageData | null> {
  const gene = await getGene(geneSlug)
  if (!gene) return null

  const snpPage = await getGeneSNPs(geneSlug, page)
  const rsids = snpPage.results.map((s) => s.rsid)
  const genotypes = await getGenotypes(profileId, rsids)

  return { gene, snpPage, genotypes }
}

export async function loadMoreSNPs(
  geneSlug: string,
  profileId: string,
  page: number
): Promise<{ snpPage: SNPSummaryPage; genotypes: SNPGenotype[] }> {
  const snpPage = await getGeneSNPs(geneSlug, page)
  const rsids = snpPage.results.map((s) => s.rsid)
  const genotypes = await getGenotypes(profileId, rsids)
  return { snpPage, genotypes }
}

// ─── SNP Detail Types ─────────────────────────────────────────────────────────

export interface SNPGene {
  overall_score: number
  slug: string
}

export interface SNPTrait {
  trait_name: string
  study_id: string | null
  pub_date: string | null
  pub_title: string | null
  pub_author: string | null
  pub_journal: string | null
  variant_id: string | null
  beta: number | null
}

export interface SNPDetail {
  rsid: string
  alts: string[]
  variant_ids: string[]
  frequency_tables: SNPFrequencyTable[]
  chrom: string
  pos: number
  ref: string
  sd_description: string
  sd_summary: string
  genes: SNPGene[]
  traits: SNPTrait[]
}

// ─── SNP Detail API call ──────────────────────────────────────────────────────

export async function getSNPDetail(rsid: string): Promise<SNPDetail | null> {
  const token = await getAccessToken()
  const res = await fetch(
    `${B2B}/open-target-snp/?rsid=${encodeURIComponent(rsid)}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    }
  )
  if (!res.ok) return null
  const data: SNPDetail[] = await res.json()
  return data[0] ?? null
}

export async function loadSNPPageData(
  rsid: string,
  profileId: string
): Promise<{ snp: SNPDetail; genotype: SNPGenotype | null } | null> {
  const snp = await getSNPDetail(rsid)
  if (!snp) return null
  const genotypes = await getGenotypes(profileId, [rsid])
  return { snp, genotype: genotypes[0] ?? null }
}