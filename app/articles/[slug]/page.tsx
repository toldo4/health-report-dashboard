import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User } from "lucide-react"
import { getArticle } from "@/actions/articles"
import { getGeneSNPs, getGenotypes, type SNPSummary, type SNPGenotype } from "@/actions/gene"
import { ArticleClientShell } from "@/components/article-client-shell"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })
}

function HtmlContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm max-w-none text-foreground
        prose-headings:text-foreground prose-headings:font-semibold
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-h1:text-xl prose-h2:text-base prose-h3:text-sm
        prose-ul:my-2 prose-li:my-0.5 ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ─── SNP Table (server-rendered, data already fetched) ────────────────────────

function ImpactBar({ score }: { score: number }) {
  const filled = Math.max(1, Math.round(score * 4))
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`h-2 w-5 rounded-sm ${i < filled ? "bg-violet-500" : "bg-muted"}`} />
      ))}
    </div>
  )
}

function SNPTableInline({
  snps,
  genotypes,
}: {
  snps: SNPSummary[]
  genotypes: SNPGenotype[]
}) {
  const genotypeMap = new Map(genotypes.map((g) => [g.rsid, g]))

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/30 overflow-hidden my-6">
      <div className="px-4 py-3 border-b border-violet-200 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
          <User className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm font-semibold text-foreground">Your Personalized SNP Table</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-violet-200 bg-violet-50">
              {["Variant", "Genotype", "Frequency", "Alternative Allele", "Impact"].map((h) => (
                <th key={h} className="py-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snps.map((snp) => {
              const genotype = genotypeMap.get(snp.rsid)
              const genotypeStr = genotype?.genotypes?.join(", ") ?? "/"

              // compute frequency (simple: just show alt frequency for first alt)
              const altFreq = snp.frequency_tables[0]?.gnomad_nfe
              const freqStr = altFreq !== undefined ? `${Math.round(altFreq * 100)}%` : "/"

              return (
                <tr key={snp.rsid} className="border-b border-violet-100 hover:bg-violet-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      href={`/articles`}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      {snp.rsid}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-foreground">{genotypeStr}</td>
                  <td className="py-3 px-4 text-sm text-foreground">{freqStr}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {snp.alts.slice(0, 4).map((alt, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200"
                        >
                          {alt.length === 1 ? alt : alt.slice(0, 1)}
                        </span>
                      ))}
                      {snp.alts.length > 4 && (
                        <span className="text-xs text-muted-foreground">+{snp.alts.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <ImpactBar score={snp.overall_score} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default async function ArticleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ profile_id?: string }>
}) {
  const { slug } = await params
  const { profile_id: profileId } = await searchParams

  const article = await getArticle(slug).catch(() => null)
  if (!article) notFound()

  // Fetch SNP data for sections that have snps
  const snpDataMap = new Map<string, { snps: SNPSummary[]; genotypes: SNPGenotype[] }>()

  await Promise.all(
    article.content
      .filter((section) => section.snps && section.snps.length > 0)
      .map(async (section) => {
        try {
          // Fetch SNP summaries for each gene associated with the article
          const allSnps: SNPSummary[] = []
          await Promise.all(
            article.genes.filter(Boolean).map(async (gene) => {
              const page = await getGeneSNPs(gene!, 1, 20).catch(() => null)
              if (!page) return
              // Filter to only the rsids in this section
              const filtered = page.results.filter((s) => section.snps.includes(s.rsid))
              allSnps.push(...filtered)
            })
          )

          // Fetch genotypes if we have a profile
          let genotypes: SNPGenotype[] = []
          if (profileId && section.snps.length > 0) {
            genotypes = await getGenotypes(profileId, section.snps).catch(() => [])
          }

          snpDataMap.set(section.id, { snps: allSnps, genotypes })
        } catch {
          // silently skip
        }
      })
  )

  const tocItems = [
    ...article.content.map((s) => ({ id: `section-${s.id}`, title: s.title })),
    ...(article.recommendations.length > 0
      ? [{ id: "recommendations", title: "Recommendations" }]
      : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="border-b border-border bg-card px-6 py-3">
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── Main content ── */}
          <div className="lg:col-span-2">
            {/* Article header */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {article.area.map((a) => (
                  <Link
                    key={a}
                    href={`/articles?area=${encodeURIComponent(a)}`}
                    className="text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:border-violet-300 hover:text-violet-700 transition-colors"
                  >
                    {a}
                  </Link>
                ))}
                {article.genes.filter(Boolean).map((g) => (
                  <span
                    key={g}
                    className="text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border border-violet-200 text-violet-700 bg-violet-50"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
                {article.title}
              </h1>

              {article.author && (
                <p className="text-sm text-muted-foreground">
                  Written by{" "}
                  <span className="text-foreground font-medium">{article.author.name}</span>
                  {article.author.title && (
                    <span className="text-muted-foreground">, {article.author.title}</span>
                  )}
                  {article.publish_date && (
                    <span> on {formatDate(article.publish_date)}</span>
                  )}
                </p>
              )}
            </div>

            {/* Summary callout */}
            {article.summary && (
              <div className="border-l-4 border-violet-500 pl-4 py-1 mb-8 bg-muted/20 rounded-r-lg">
                <HtmlContent html={article.summary} className="prose-p:my-0 prose-strong:font-semibold" />
              </div>
            )}

            {/* Content sections */}
            {article.content.map((section) => {
              const snpData = snpDataMap.get(section.id)
              // Remove {snp-table} placeholder from text
              const cleanText = section.text.replace(/\{snp-table\}/g, "")

              return (
                <div key={section.id} id={`section-${section.id}`} className="mb-10">
                  <h2 className="text-xl font-bold text-foreground mb-4">{section.title}</h2>
                  <HtmlContent html={cleanText} />
                  {snpData && snpData.snps.length > 0 && (
                    <SNPTableInline snps={snpData.snps} genotypes={snpData.genotypes} />
                  )}
                </div>
              )
            })}

            {/* Recommendations */}
            {article.recommendations.length > 0 && (
              <div id="recommendations" className="mb-10">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  {article.recommendation_title || "Recommendations"}
                </h2>
                <div className="space-y-8">
                  {article.recommendations.map((rec, i) => (
                    <div key={rec.id}>
                      {i > 0 && <hr className="border-border mb-8" />}
                      <h3 className="text-base font-semibold text-foreground mb-3">{rec.title}</h3>
                      <HtmlContent html={rec.text} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Author card */}
            {article.author && (
              <div className="rounded-xl border border-border bg-card overflow-hidden mt-10">
                <div className="border-l-4 border-violet-500 p-5">
                  <div className="flex items-start gap-4">
                    {article.author.photo ? (
                      <img
                        src={article.author.photo}
                        alt={article.author.name}
                        className="w-16 h-16 rounded-lg object-cover shrink-0 grayscale"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <User className="w-7 h-7 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground">{article.author.name}</p>
                      {article.author.title && (
                        <p className="text-sm font-semibold text-violet-600 uppercase tracking-wide mb-2">
                          {article.author.title}
                        </p>
                      )}
                      <HtmlContent html={article.author.intro} className="prose-p:my-0.5 prose-p:text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="lg:col-span-1">
            <ArticleClientShell
              tocItems={tocItems}
              areaLabel={article.area[0]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}