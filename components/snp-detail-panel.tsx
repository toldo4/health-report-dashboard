"use client"

import { useState, useEffect, useTransition } from "react"
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react"
import {
  loadSNPPageData,
  type SNPDetail,
  type SNPGenotype,
  type SNPFrequencyTable,
} from "@/actions/gene"
import { computePersonalizedFrequency, getEthnicityKey } from "@/lib/gene-utils"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function HtmlContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm max-w-none text-foreground
        prose-headings:text-foreground prose-headings:font-semibold
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-ul:my-1 prose-li:my-0.5 prose-h1:text-base prose-h2:text-sm ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function ImpactBar({ beta }: { beta: number | null }) {
  if (beta === null) return (
    <div className="flex gap-0.5">
      {[0,1,2,3].map(i => <div key={i} className="h-2 w-5 rounded-sm bg-muted" />)}
    </div>
  )
  const abs = Math.min(Math.abs(beta), 1)
  const filled = Math.max(1, Math.round(abs * 4))
  return (
    <div className="flex gap-0.5 items-center">
      {[0,1,2,3].map(i => (
        <div key={i} className={`h-2 w-5 rounded-sm ${i < filled ? "bg-violet-500" : "bg-muted"}`} />
      ))}
    </div>
  )
}

const FREQ_LABELS: [keyof SNPFrequencyTable, string][] = [
  ["gnomad_afr", "African/African-American"],
  ["gnomad_amr", "Latino/Admixed American"],
  ["gnomad_asj", "Ashkenazi Jewish"],
  ["gnomad_eas", "East Asian"],
  ["gnomad_fin", "Finnish"],
  ["gnomad_nfe", "European"],
  ["gnomad_oth", "Other (population not assigned)"],
]

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
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  )
}

// ─── SNP Intro Section ────────────────────────────────────────────────────────

function SNPIntro({
  snp,
  genotype,
  ethnicity,
}: {
  snp: SNPDetail
  genotype: SNPGenotype | null
  ethnicity?: string | null
}) {
  const ethnicityKey = getEthnicityKey(ethnicity)
  const genotypeStr = genotype?.genotypes?.join("") ?? null

  // Compute frequency for ref+ref (most common case) using the profile's genotype
  let freqPct: number | null = null
  if (genotype && snp.frequency_tables[0]) {
    // Build a minimal SNPSummary-compatible object for the utility
    const mockSnp = {
      rsid: snp.rsid,
      alts: snp.alts,
      variant_ids: snp.variant_ids,
      frequency_tables: snp.frequency_tables,
      overall_score: 0,
      gene_slug: "",
    }
    const raw = computePersonalizedFrequency(mockSnp, genotype.genotypes, ethnicityKey)
    if (raw !== null) freqPct = Math.round(raw * 100)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground font-mono">{snp.rsid}</h1>
              <a
                href={`https://selfdecode.com/snp/${snp.rsid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Chromosome: {snp.chrom}, Position: {snp.pos.toLocaleString()}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground shrink-0 max-w-[180px]">
            <p>Reference Allele: <span className="font-mono font-semibold text-foreground">{snp.ref}</span></p>
            <div className="mt-0.5">
              <span>Alternative Alleles: </span>
              <span className="font-mono font-semibold text-foreground">
                {snp.alts.slice(0, 3).join(", ")}
                {snp.alts.length > 3 && (
                  <span className="font-sans font-normal text-muted-foreground"> +{snp.alts.length - 3} more</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/40 rounded-lg leading-relaxed">
          Most conditions are affected by anywhere from hundreds to millions of genetic variants (SNPs). A single SNP usually has a minor contribution to a person&apos;s overall genetic risk for a certain condition. That is why you shouldn&apos;t consider or act on a SNP in isolation. Instead, we use SNPs to determine polygenic risk scores (PRSs), which are the basis of most health reports.
        </p>
      </div>

      {/* Genotype card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4 border-l-4 border-violet-500 pl-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">Your Genotype:</span>
              <span className="text-xl font-bold text-violet-600 font-mono">
                {genotypeStr ?? "Not available"}
              </span>
            </div>
            {freqPct !== null && (
              <p className="text-sm text-muted-foreground mt-1">
                {freqPct}% of people of your ethnicity have this variation
              </p>
            )}
            {!genotype && (
              <p className="text-sm text-muted-foreground mt-1">No genotype data available for this profile</p>
            )}
          </div>
        </div>
      </div>

      {/* Associated Genes */}
      {snp.genes.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-foreground">Associated Genes</h2>
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-56 bg-popover border border-border rounded-lg p-2 text-xs text-muted-foreground shadow-lg">
                Genes associated with this SNP, ordered by impact score.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {[...snp.genes]
              .sort((a, b) => b.overall_score - a.overall_score)
              .map((gene) => (
                <div key={gene.slug} className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-primary">{gene.slug}</span>
                  <div className="flex gap-0.5">
                    {[0,1,2,3].map(i => {
                      const filled = Math.round(gene.overall_score * 4)
                      return (
                        <div
                          key={i}
                          className={`h-1.5 w-3 rounded-sm ${i < filled ? "bg-violet-500" : "bg-muted"}`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Traits Table ─────────────────────────────────────────────────────────────

const TRAITS_PAGE_SIZE = 6

function TraitsTable({ traits }: { traits: SNPDetail["traits"] }) {
  const [shown, setShown] = useState(TRAITS_PAGE_SIZE)
  const visible = traits.slice(0, shown)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">Traits</h2>
        <div className="group relative">
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-64 bg-popover border border-border rounded-lg p-2 text-xs text-muted-foreground shadow-lg">
            Traits associated with this SNP from genome-wide association studies (GWAS).
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Trait", "Variant", "Impact", "PMID", "Author (Year)"].map(h => (
                <th key={h} className="py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((trait, i) => {
              const year = trait.pub_date ? new Date(trait.pub_date).getFullYear() : null
              const gwasUrl = trait.study_id
                ? `https://www.ebi.ac.uk/gwas/studies/${trait.study_id}`
                : null
              // Extract just the alt allele letter from variant_id e.g. "22_19963748_G_A" → "A"
              const variantAllele = trait.variant_id?.split("_")[3] ?? trait.variant_id ?? "—"

              return (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-sm text-foreground max-w-[200px]">
                    {trait.trait_name}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-foreground">
                    {variantAllele}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <ImpactBar beta={trait.beta} />
                      {trait.beta !== null && (
                        trait.beta < 0
                          ? <ArrowDown className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          : <ArrowUp className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {gwasUrl && trait.pub_journal ? (
                      <a
                        href={gwasUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {trait.pub_journal}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                    {trait.pub_author && year ? `${trait.pub_author} (${year})` : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {shown < traits.length && (
        <div className="p-4 border-t border-border flex justify-center">
          <button
            onClick={() => setShown(s => s + TRAITS_PAGE_SIZE)}
            className="px-6 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Frequency Table ──────────────────────────────────────────────────────────

function FrequencyTable({ snp }: { snp: SNPDetail }) {
  if (!snp.frequency_tables[0]) return null
  const table = snp.frequency_tables[0]
  const altAllele = snp.alts[0] ?? "—"

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">Population Allele Frequency</h2>
        <div className="group relative">
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-64 bg-popover border border-border rounded-lg p-2 text-xs text-muted-foreground shadow-lg">
            Shows how common the alternative allele is in a certain population.
          </div>
        </div>
      </div>
      <div className="p-5">
        <p className="text-xs text-muted-foreground mb-3">Alternative Allele: <span className="font-mono font-semibold text-foreground">{altAllele}</span></p>
        <table className="w-full max-w-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left">Ethnicity</th>
              <th className="py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Frequency</th>
            </tr>
          </thead>
          <tbody>
            {FREQ_LABELS.map(([key, label]) => {
              const val = table[key]
              if (val === undefined) return null
              return (
                <tr key={key} className="border-b border-border last:border-0">
                  <td className="py-3 text-sm text-foreground">{label}</td>
                  <td className="py-3 text-sm text-foreground text-right font-mono">
                    {val.toFixed(4)}
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

// ─── Main SNP Detail Panel ────────────────────────────────────────────────────

interface SNPDetailPanelProps {
  rsid: string
  profileId: string
  ethnicity?: string | null
  onBack: () => void
}

export function SNPDetailPanel({ rsid, profileId, ethnicity, onBack }: SNPDetailPanelProps) {
  const [data, setData] = useState<{ snp: SNPDetail; genotype: SNPGenotype | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await loadSNPPageData(rsid, profileId)
        if (!result) {
          setError(`SNP "${rsid}" not found.`)
          return
        }
        setData(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load SNP data")
      }
    })
  }, [rsid, profileId])

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to gene
      </button>

      {isPending && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card h-40 animate-pulse" />
          <div className="rounded-xl border border-border bg-card h-32 animate-pulse" />
          <div className="rounded-xl border border-border bg-card h-64 animate-pulse" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {data && !isPending && (
        <>
          <SNPIntro snp={data.snp} genotype={data.genotype} ethnicity={ethnicity} />
          {data.snp.traits.length > 0 && <TraitsTable traits={data.snp.traits} />}
          {data.snp.sd_summary && (
            <SectionCard title="Summary" defaultOpen={true}>
              <HtmlContent html={data.snp.sd_summary} />
            </SectionCard>
          )}
          {data.snp.sd_description && (
            <SectionCard title="More Information" defaultOpen={false}>
              <HtmlContent html={data.snp.sd_description} />
            </SectionCard>
          )}
          <FrequencyTable snp={data.snp} />
        </>
      )}
    </div>
  )
}