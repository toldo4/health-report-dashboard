"use client"

import { useState, useTransition, useCallback } from "react"
import {
  Search,
  Dna,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Loader2,
  AlertCircle,
  BarChart2,
} from "lucide-react"
import {
  loadGenePageData,
  loadMoreSNPs,
  type GenePageData,
  type SNPSummary,
  type SNPGenotype,
  type OpenTargetGene,
} from "@/actions/gene"
import {
  computePersonalizedFrequency,
  getEthnicityKey,
} from "@/lib/gene-utils"
import { SNPDetailPanel } from "@/components/snp-detail-panel"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function ImpactBar({ score }: { score: number }) {
  // score is 0-1; render 4 segments
  const filled = Math.round(score * 4)
  return (
    <div className="flex gap-0.5 items-center">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-2 w-5 rounded-sm ${
            i < filled ? "bg-violet-500" : "bg-muted"
          }`}
        />
      ))}
    </div>
  )
}

function FrequencyBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className="text-sm font-medium text-foreground">{Math.round(pct * 100)}%</span>
  )
}

function HtmlContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm max-w-none text-foreground 
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-ul:my-1 prose-li:my-0.5 ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ─── SNP Row ─────────────────────────────────────────────────────────────────

function SNPRow({
  snp,
  genotype,
  ethnicityKey,
  onSelectSNP,
}: {
  snp: SNPSummary
  genotype: SNPGenotype | undefined
  ethnicityKey: ReturnType<typeof getEthnicityKey>
  onSelectSNP: (rsid: string) => void
}) {
  const freq = computePersonalizedFrequency(snp, genotype?.genotypes ?? [], ethnicityKey)
  const genotypeStr = genotype?.genotypes?.join(", ") ?? "/"

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <button
          onClick={() => onSelectSNP(snp.rsid)}
          className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1"
        >
          {snp.rsid}
          <ExternalLink className="w-3 h-3 opacity-50" />
        </button>
      </td>
      <td className="py-3 px-4 text-sm text-foreground font-mono">{genotypeStr}</td>
      <td className="py-3 px-4">
        <FrequencyBadge pct={freq} />
      </td>
      <td className="py-3 px-4 max-w-[140px]">
        {(() => {
          const isLong = snp.alts.some((a) => a.length > 2)
          if (isLong) {
            return (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-mono text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5 truncate max-w-[80px]">
                  {snp.alts[0]}
                </span>
                {snp.alts.length > 1 && (
                  <span className="text-muted-foreground text-xs shrink-0">+{snp.alts.length - 1} more</span>
                )}
              </span>
            )
          }
          return (
            <div className="flex flex-wrap gap-1">
              {snp.alts.slice(0, 4).map((alt, i) => (
                <span
                  key={i}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200 shrink-0"
                >
                  {alt}
                </span>
              ))}
              {snp.alts.length > 4 && (
                <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
                  +{snp.alts.length - 4}
                </span>
              )}
            </div>
          )
        })()}
      </td>
      <td className="py-3 px-4">
        <ImpactBar score={snp.overall_score} />
      </td>
    </tr>
  )
}

// ─── SNP Table ────────────────────────────────────────────────────────────────

function SNPTable({
  snps,
  genotypes,
  ethnicityKey,
  totalCount,
  onLoadMore,
  loadingMore,
  onSelectSNP,
}: {
  snps: SNPSummary[]
  genotypes: SNPGenotype[]
  ethnicityKey: ReturnType<typeof getEthnicityKey>
  totalCount: number
  onLoadMore: () => void
  loadingMore: boolean
  onSelectSNP: (rsid: string) => void
}) {
  const genotypeMap = new Map(genotypes.map((g) => [g.rsid, g]))

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Your SNP Table</h2>
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-56 bg-popover border border-border rounded-lg p-2 text-xs text-muted-foreground shadow-lg">
              A list of SNPs associated with this gene.
            </div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing {snps.length} / {totalCount.toLocaleString()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Variant", "Genotype", "Frequency", "Alternative Allele", "Impact"].map((h) => (
                <th key={h} className="py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snps.map((snp) => (
              <SNPRow
                key={snp.rsid}
                snp={snp}
                genotype={genotypeMap.get(snp.rsid)}
                ethnicityKey={ethnicityKey}
                onSelectSNP={onSelectSNP}
              />
            ))}
          </tbody>
        </table>
      </div>

      {snps.length < totalCount && (
        <div className="p-4 border-t border-border flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 border-b border-border flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  )
}

// ─── Gene Info ────────────────────────────────────────────────────────────────

function GeneInfo({ gene }: { gene: OpenTargetGene }) {
  return (
    <div className="space-y-4">
      {/* Summary + Protein Names side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Summary</h2>
          <HtmlContent html={gene.sd_summary} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Protein Names</h2>
          <p className="text-sm text-muted-foreground">{gene.open_target_description}</p>
        </div>
      </div>

      {gene.sd_ghr_function && (
        <SectionCard title="GHR Function" defaultOpen={true}>
          <HtmlContent html={gene.sd_ghr_function} />
        </SectionCard>
      )}

      {gene.sd_description && (
        <SectionCard title="More Information" defaultOpen={false}>
          <HtmlContent html={gene.sd_description} />
        </SectionCard>
      )}

      {gene.sd_recommendation && (
        <SectionCard title="Lifestyle & Supplement Interactions" defaultOpen={false}>
          <HtmlContent html={gene.sd_recommendation} />
        </SectionCard>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface GeneDetailPanelProps {
  profileId: string
  ethnicity?: string | null
}

export function GeneDetailPanel({ profileId, ethnicity }: GeneDetailPanelProps) {
  const [query, setQuery] = useState("")
  const [data, setData] = useState<GenePageData | null>(null)
  const [allSNPs, setAllSNPs] = useState<SNPSummary[]>([])
  const [allGenotypes, setAllGenotypes] = useState<SNPGenotype[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedSnpRsid, setSelectedSnpRsid] = useState<string | null>(null)

  const ethnicityKey = getEthnicityKey(ethnicity)

  const handleSearch = useCallback(() => {
    const slug = query.trim().toUpperCase()
    if (!slug) return
    setError(null)
    setData(null)
    setAllSNPs([])
    setAllGenotypes([])
    setCurrentPage(1)

    startTransition(async () => {
      try {
        const result = await loadGenePageData(slug, profileId, 1)
        if (!result) {
          setError(`Gene "${slug}" not found. Check the gene symbol and try again.`)
          return
        }
        setData(result)
        setAllSNPs(result.snpPage.results)
        setAllGenotypes(result.genotypes)
        setCurrentPage(1)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load gene data")
      }
    })
  }, [query, profileId])

  const handleLoadMore = useCallback(async () => {
    if (!data) return
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const { snpPage, genotypes } = await loadMoreSNPs(data.gene.slug, profileId, nextPage)
      setAllSNPs((prev) => [...prev, ...snpPage.results])
      setAllGenotypes((prev) => [...prev, ...genotypes])
      setCurrentPage(nextPage)
    } catch (e) {
      console.error("Load more failed:", e)
    } finally {
      setLoadingMore(false)
    }
  }, [data, currentPage, profileId])

  // ── SNP detail view ──────────────────────────────────────────────────────────
  if (selectedSnpRsid) {
    return (
      <SNPDetailPanel
        rsid={selectedSnpRsid}
        profileId={profileId}
        ethnicity={ethnicity}
        onBack={() => setSelectedSnpRsid(null)}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Gene Search</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter a gene symbol (e.g. BRCA1, APOE, MTHFR) to view personalized SNP data
          </p>
        </div>
        <div className="p-5">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search gene symbol…"
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isPending || !query.trim()}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Dna className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Try:</span>
            {["BRCA1", "BRCA2", "APOE", "MTHFR", "TP53"].map((gene) => (
              <button
                key={gene}
                onClick={() => {
                  setQuery(gene)
                }}
                className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                {gene}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {isPending && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card h-48 animate-pulse" />
          <div className="rounded-xl border border-border bg-card h-64 animate-pulse" />
        </div>
      )}

      {/* Results */}
      {data && !isPending && (
        <>
          {/* Gene header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center">
              <Dna className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground font-mono">{data.gene.slug}</h1>
              <p className="text-xs text-muted-foreground">{stripHtml(data.gene.open_target_description).split("[")[0].trim()}</p>
            </div>
          </div>

          {/* SNP Table */}
          <SNPTable
            snps={allSNPs}
            genotypes={allGenotypes}
            ethnicityKey={ethnicityKey}
            totalCount={data.snpPage.count}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            onSelectSNP={setSelectedSnpRsid}
          />

          {/* Gene info sections */}
          <GeneInfo gene={data.gene} />
        </>
      )}

      {/* Empty state */}
      {!data && !isPending && !error && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 flex flex-col items-center gap-3 text-center">
          <BarChart2 className="w-10 h-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">No gene selected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Search for a gene symbol above to view SNP data and personalized frequency
            </p>
          </div>
        </div>
      )}
    </div>
  )
}