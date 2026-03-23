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

export type HealthArea =
  | "mental health" | "cognition" | "gut health" | "nutrition"
  | "food sensitivities" | "allergies" | "heart & blood vessels" | "thyroid"
  | "sleep" | "inflammation & autoimmunity" | "immunity & infections"
  | "energy & fatigue" | "weight & body fat" | "blood sugar control" | "pain"
  | "nerve health" | "headaches & migraines" | "detox" | "longevity"
  | "joint & tendon health" | "bone health" | "injuries" | "liver health"
  | "kidney health" | "sex hormones" | "sexual health" | "reproductive health"
  | "fitness" | "skin & beauty" | "addictions" | "urinary tract health"
  | "respiratory health" | "eye health" | "dental & mouth health"
  | "hearing & balance" | "cancer" | "cognitive" | "personality"
  | "physical features" | "characteristics"

export interface Author {
  id: number
  name: string
  title: string | null
  intro: string
  photo: string
}

export interface ArticleSummary {
  slug: string
  title: string
  summary: string
  meta_description: string
  genes: (string | null)[]
  area: HealthArea[]
  author: Author | null
  publish_date: string | null
  featured: boolean
  recommendation_title: string
}

export interface ArticleSection {
  id: string
  title: string
  text: string
  snps: string[]
}

export interface RecommendationSection {
  id: number
  title: string
  text: string
}

export interface Article extends ArticleSummary {
  content: ArticleSection[]
  recommendations: RecommendationSection[]
  related_reports: string[]
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getArticles(params?: {
  q?: string
  area?: HealthArea
  genes?: string
}): Promise<ArticleSummary[]> {
  const token = await getAccessToken()
  const query = new URLSearchParams()
  if (params?.q) query.set("q", params.q)
  if (params?.area) query.set("area", params.area)
  if (params?.genes) query.set("genes", params.genes)

  const res = await fetch(`${B2B}/article-summary/?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`)
  return res.json()
}

export async function getArticle(slug: string): Promise<Article | null> {
  const token = await getAccessToken()
  const res = await fetch(`${B2B}/article/${encodeURIComponent(slug)}/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch article: ${res.status}`)
  return res.json()
}