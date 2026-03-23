import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User } from "lucide-react"
import { getArticle } from "@/actions/articles"
import { ArticleClientShell } from "@/components/article-client-shell"
import { PersonalizedSNPSection } from "@/components/personalized-snp-section"

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default async function ArticleDetailPage({
  params }: {
    params: Promise<{ slug: string }>
  }) {
  const { slug } = await params

  const article = await getArticle(slug).catch(() => null)
  if (!article) notFound()

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
              // Remove {snp-table} placeholder from text
              const cleanText = section.text.replace(/\{snp-table\}/g, "")

              return (
                <div key={section.id} id={`section-${section.id}`} className="mb-10">
                  <h2 className="text-xl font-bold text-foreground mb-4">{section.title}</h2>
                  <HtmlContent html={cleanText} />
                  {section.snps && section.snps.length > 0 && (
                    <PersonalizedSNPSection rsids={section.snps} />
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