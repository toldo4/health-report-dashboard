import Link from "next/link"
import { Search, BookOpen, ChevronRight } from "lucide-react"
import { getArticles, type HealthArea } from "@/actions/articles"
import { ALL_AREAS } from "@/lib/article-utils"

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function capitalize(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; page?: string }>
}) {
  const { q, area, page } = await searchParams
  const activeArea = area as HealthArea | undefined
  const PAGE_SIZE = 20
  const currentPage = Math.max(1, parseInt(page ?? "1", 10))

  const allArticles = await getArticles({
    q: q || undefined,
    area: activeArea,
  }).catch(() => [])

  const totalPages = Math.max(1, Math.ceil(allArticles.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const articles = allArticles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (activeArea) params.set("area", activeArea)
    if (p > 1) params.set("page", String(p))
    const qs = params.toString()
    return `/articles${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className="w-6 h-6 text-violet-600" />
            <h1 className="text-2xl font-bold text-foreground">Genetics Articles</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-9">
            Browse through hundreds of articles on genetic research and discover your personalized insights
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <form method="GET" className="mb-8">
          {activeArea && <input type="hidden" name="area" value={activeArea} />}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search for articles…"
              className="w-full pl-10 pr-4 py-2.5 border-b-2 border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Article list */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {activeArea ? capitalize(activeArea) : "All Articles"}
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {allArticles.length}
              </span>
            </div>

            {articles.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No articles found{q ? ` for "${q}"` : ""}.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {articles.map((article) => (
                  <article key={article.slug} className="py-5 group">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {article.area.slice(0, 2).map((a) => (
                        <Link
                          key={a}
                          href={`/articles?area=${encodeURIComponent(a)}`}
                          className="text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                        >
                          {a}
                        </Link>
                      ))}
                      {article.genes.filter(Boolean).slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border border-violet-200 text-violet-700 bg-violet-50"
                        >
                          {g}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/articles/${article.slug}`}
                      className="block group-hover:text-violet-700 transition-colors"
                    >
                      <h3 className="text-base font-semibold text-primary mb-1 leading-snug">
                        {article.title}
                      </h3>
                    </Link>

                    {article.author && (
                      <p className="text-xs text-muted-foreground mb-1.5">
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

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.meta_description}
                    </p>

                    <Link
                      href={`/articles/${article.slug}`}
                      className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 mt-2 font-medium"
                    >
                      Read more <ChevronRight className="w-3 h-3" />
                    </Link>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages} &middot; {allArticles.length} articles
                </p>
                <div className="flex items-center gap-1">
                  {/* Prev */}
                  {safePage > 1 ? (
                    <a
                      href={pageUrl(safePage - 1)}
                      className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      ← Prev
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground/40 cursor-not-allowed">
                      ← Prev
                    </span>
                  )}

                  {/* Page numbers — show up to 5 around current */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…")
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-muted-foreground">…</span>
                      ) : (
                        <a
                          key={p}
                          href={pageUrl(p as number)}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                            p === safePage
                              ? "bg-violet-600 text-white border-violet-600"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {p}
                        </a>
                      )
                    )}

                  {/* Next */}
                  {safePage < totalPages ? (
                    <a
                      href={pageUrl(safePage + 1)}
                      className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      Next →
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground/40 cursor-not-allowed">
                      Next →
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Browse by Categories */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Browse by Categories</h2>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/articles"
                  className={`text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
                    !activeArea
                      ? "bg-violet-600 text-white border-violet-600"
                      : "border-border text-muted-foreground hover:border-violet-300 hover:text-violet-700"
                  }`}
                >
                  All
                </Link>
                {ALL_AREAS.map((a) => (
                  <Link
                    key={a}
                    href={`/articles?area=${encodeURIComponent(a)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    className={`text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
                      activeArea === a
                        ? "bg-violet-600 text-white border-violet-600"
                        : "border-border text-muted-foreground hover:border-violet-300 hover:text-violet-700"
                    }`}
                  >
                    {a}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}