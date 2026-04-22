"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { Loader2, Printer, Plus, X, ChevronRight, Dna } from "lucide-react"
import { getSNPsByRsids, getMultiProfileGenotypes } from "@/actions/gene"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  name: string
  sex?: string
  birth_year?: number
  birth_month?: number
  birth_day?: number
  ethnicity?: string
}

interface RsidEntry {
  rsid: string
  gene: string
  loading?: boolean
}

interface ReportRow {
  profile: Profile
  genotypes: Map<string, string>
}

// ─── Predefined panels ─────────────────────────────────────────────────────────

const PREDEFINED_PANELS: Record<string, RsidEntry[]> = {
  "T2D": [
    { rsid: "rs7903146",  gene: "TCF7L2"  },
    { rsid: "rs10811661", gene: "CDKN2A"  },
    { rsid: "rs7756992",  gene: "CDKAL1"  },
    { rsid: "rs13266634", gene: "SLC30A8" },
    { rsid: "rs1799884",  gene: "GCK"     },
    { rsid: "rs780094",   gene: "GCKR"    },
    { rsid: "rs4402960",  gene: "IGF2BP2" },
    { rsid: "rs2943641",  gene: "IRS1"    },
    { rsid: "rs1801282",  gene: "PPARG"   },
    { rsid: "rs1111875",  gene: "HHEX"    },
    { rsid: "rs2237892",  gene: "KCNQ1"   },
    { rsid: "rs11708067", gene: "ADCY5"   },
    { rsid: "rs1421085",  gene: "FTO"     },
    { rsid: "rs12970134", gene: "MC4R"    },
    { rsid: "rs10423928", gene: "GIPR"    },
  ],
}

const ALL_PANEL_RSIDS = Object.entries(PREDEFINED_PANELS).flatMap(([panel, entries]) =>
  entries.map((e) => ({ ...e, panel }))
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeAge(p: Profile): number | null {
  if (!p.birth_year) return null
  const today = new Date()
  let age = today.getFullYear() - p.birth_year
  if (p.birth_month && p.birth_day) {
    const hasHadBirthday =
      today.getMonth() + 1 > p.birth_month ||
      (today.getMonth() + 1 === p.birth_month && today.getDate() >= p.birth_day)
    if (!hasHadBirthday) age--
  }
  return age
}

function capitalize(s: string | undefined) {
  if (!s) return "—"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PrsReportBuilder({ profiles }: { profiles: Profile[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rsidEntries, setRsidEntries] = useState<RsidEntry[]>([])
  const [rsidInput, setRsidInput] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [reportTitle, setReportTitle] = useState(
    "T2D Nutrigenomic PRS Dataset – GCC/Emirati Population"
  )
  const [reportSubtitle, setReportSubtitle] = useState("")
  const [reportRows, setReportRows] = useState<ReportRow[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Profile selection ───────────────────────────────────────────────────────

  const allSelected = profiles.length > 0 && selectedIds.size === profiles.length

  function toggleAll() {
    setSelectedIds(
      allSelected ? new Set() : new Set(profiles.map((p) => p.id))
    )
  }

  function toggleProfile(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── rsID management ─────────────────────────────────────────────────────────

  function addPanel(name: string) {
    const panel = PREDEFINED_PANELS[name]
    setRsidEntries((prev) => {
      const existing = new Set(prev.map((e) => e.rsid))
      return [...prev, ...panel.filter((e) => !existing.has(e.rsid))]
    })
  }

  const resolveGeneNames = useCallback(
    (rsids: string[]) => {
      startTransition(async () => {
        const snps = await getSNPsByRsids(rsids)
        setRsidEntries((prev) =>
          prev.map((e) => {
            if (!rsids.includes(e.rsid) || !e.loading) return e
            const snp = snps.find((s) => s.rsid === e.rsid)
            const gene = snp?.gene_slug
              ? snp.gene_slug.toUpperCase().replace(/-/g, "")
              : ""
            return { ...e, gene, loading: false }
          })
        )
      })
    },
    []
  )

  function commitRsids(raw: string) {
    const rsids = raw
      .toLowerCase()
      .split(/[\s,;]+/)
      .map((r) => r.trim())
      .filter((r) => /^rs\d+$/.test(r))

    if (rsids.length === 0) return
    setRsidInput("")
    setShowSuggestions(false)

    setRsidEntries((prev) => {
      const existing = new Set(prev.map((e) => e.rsid))
      const newEntries = rsids
        .filter((r) => !existing.has(r))
        .map((r) => {
          const known = ALL_PANEL_RSIDS.find((p) => p.rsid === r)
          return known
            ? { rsid: r, gene: known.gene, loading: false }
            : { rsid: r, gene: "", loading: true }
        })

      const needsLookup = newEntries.filter((e) => e.loading).map((e) => e.rsid)
      if (needsLookup.length > 0) resolveGeneNames(needsLookup)

      return [...prev, ...newEntries]
    })
  }

  function addSuggestion(entry: RsidEntry) {
    setRsidInput("")
    setShowSuggestions(false)
    setRsidEntries((prev) => {
      if (prev.some((e) => e.rsid === entry.rsid)) return prev
      return [...prev, { ...entry, loading: false }]
    })
  }

  function removeRsid(rsid: string) {
    setRsidEntries((prev) => prev.filter((e) => e.rsid !== rsid))
  }

  const suggestions =
    rsidInput.length >= 2
      ? ALL_PANEL_RSIDS.filter(
          (e) =>
            (e.rsid.includes(rsidInput.toLowerCase()) ||
              e.gene.toLowerCase().includes(rsidInput.toLowerCase())) &&
            !rsidEntries.some((ex) => ex.rsid === e.rsid)
        ).slice(0, 8)
      : []

  // ── Report generation ───────────────────────────────────────────────────────

  function generateReport() {
    if (selectedIds.size === 0 || rsidEntries.length === 0) return
    setError(null)
    setReportRows(null)
    startTransition(async () => {
      try {
        const profileIds = Array.from(selectedIds)
        const rsids = rsidEntries.filter((e) => !e.loading).map((e) => e.rsid)
        const results = await getMultiProfileGenotypes(profileIds, rsids)

        const rows: ReportRow[] = profileIds.map((profileId) => {
          const profile = profiles.find((p) => p.id === profileId)!
          const result = results.find((r) => r.profileId === profileId)
          const genotypeMap = new Map<string, string>()
          rsids.forEach((rsid) => {
            const g = result?.genotypes.find((g) => g.rsid === rsid)
            genotypeMap.set(rsid, g ? g.genotypes.join("") : "--")
          })
          return { profile, genotypes: genotypeMap }
        })

        setReportRows(rows)
      } catch {
        setError("Failed to generate report. Please try again.")
      }
    })
  }

  const readyRsids = rsidEntries.filter((e) => !e.loading)
  const canGenerate = selectedIds.size > 0 && readyRsids.length > 0

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Config section (hidden in print) ────────────────────────────────── */}
      <div className="print:hidden space-y-6 mb-8">

        {/* Top row: profiles + SNPs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Profile selection */}
          <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-foreground">Select Profiles</h2>
              <button
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="divide-y divide-border overflow-y-auto max-h-72">
              {profiles.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">No profiles found.</p>
              ) : (
                profiles.map((profile) => (
                  <label
                    key={profile.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(profile.id)}
                      onChange={() => toggleProfile(profile.id)}
                      className="rounded border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          computeAge(profile) != null ? `Age ${computeAge(profile)}` : null,
                          capitalize(profile.sex),
                          profile.ethnicity,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-border bg-muted/30 shrink-0">
              <p className="text-xs text-muted-foreground">
                {selectedIds.size} of {profiles.length} selected
              </p>
            </div>
          </div>

          {/* SNP / rsID selection */}
          <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold text-foreground">Select SNPs (rsIDs)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Use a predefined panel or enter rsIDs manually.</p>
            </div>

            {/* Predefined panels */}
            <div className="px-5 pt-4 pb-3 border-b border-border shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Predefined Panels
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PREDEFINED_PANELS).map((name) => (
                  <button
                    key={name}
                    onClick={() => addPanel(name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium transition-colors"
                  >
                    <Dna className="w-3 h-3" />
                    {name} Panel
                    <span className="text-muted-foreground">
                      ({PREDEFINED_PANELS[name].length} SNPs)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom rsID input with autocomplete */}
            <div className="px-5 py-3 shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Add Custom rsIDs
              </p>
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={rsidInput}
                    onChange={(e) => {
                      setRsidInput(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRsids(rsidInput)
                      if (e.key === "Escape") setShowSuggestions(false)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="rs7903146, rs10811661 …"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => commitRsids(rsidInput)}
                    className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {/* Autocomplete suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-12 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s.rsid}
                        onMouseDown={() => addSuggestion(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <span className="font-medium text-primary w-20 shrink-0">{s.gene}</span>
                        <span className="text-muted-foreground font-mono">{s.rsid}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{s.panel} panel</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Press Enter or click Add. Separate multiple with commas.
              </p>
            </div>

            {/* rsID chips */}
            <div className="flex-1 px-5 pb-4 overflow-y-auto">
              {rsidEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No SNPs added yet.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {rsidEntries.length} SNP{rsidEntries.length !== 1 ? "s" : ""} added
                    </p>
                    <button
                      onClick={() => setRsidEntries([])}
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rsidEntries.map((entry) => (
                      <span
                        key={entry.rsid}
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-muted text-xs"
                      >
                        {entry.loading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        ) : entry.gene ? (
                          <span className="font-medium text-primary">{entry.gene}</span>
                        ) : null}
                        <span className="font-mono text-muted-foreground">{entry.rsid}</span>
                        <button
                          onClick={() => removeRsid(entry.rsid)}
                          className="w-4 h-4 rounded-full hover:bg-border flex items-center justify-center ml-0.5 shrink-0"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Report metadata */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Report Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Report Title</label>
              <input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Subtitle / PI Info
              </label>
              <input
                value={reportSubtitle}
                onChange={(e) => setReportSubtitle(e.target.value)}
                placeholder="PI: Dr. Name | Institution | Date"
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="flex items-center gap-3">
          <button
            onClick={generateReport}
            disabled={!canGenerate || isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {isPending ? "Generating…" : "Generate Report"}
          </button>

          {!canGenerate && !isPending && (
            <p className="text-xs text-muted-foreground">
              {selectedIds.size === 0
                ? "Select at least one profile."
                : "Add at least one rsID."}
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>

      {/* ── Report preview ───────────────────────────────────────────────────── */}
      {reportRows && (
        <div>
          <div className="print:hidden flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Report Preview</h2>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Export PDF
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "12px",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <thead>
                {/* Title row */}
                <tr>
                  <td
                    colSpan={4 + readyRsids.length}
                    style={{
                      background: "#0f4c8a",
                      color: "white",
                      textAlign: "center",
                      padding: "10px 16px",
                      fontWeight: "700",
                      fontSize: "14px",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {reportTitle}
                  </td>
                </tr>

                {/* Subtitle row */}
                {reportSubtitle && (
                  <tr>
                    <td
                      colSpan={4 + readyRsids.length}
                      style={{
                        background: "#0f4c8a",
                        color: "#b8d4f5",
                        textAlign: "center",
                        padding: "3px 16px 8px",
                        fontSize: "11px",
                      }}
                    >
                      {reportSubtitle}
                    </td>
                  </tr>
                )}

                {/* Column headers */}
                <tr style={{ background: "#1a5faa" }}>
                  {["Client Name", "Age", "Sex", "Ethnicity"].map((h) => (
                    <th
                      key={h}
                      style={{
                        color: "white",
                        padding: "8px 12px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        border: "1px solid #2e74c0",
                        fontWeight: "600",
                        fontSize: "11px",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                  {readyRsids.map((entry) => (
                    <th
                      key={entry.rsid}
                      style={{
                        color: "white",
                        padding: "6px 10px",
                        textAlign: "center",
                        border: "1px solid #2e74c0",
                        minWidth: "68px",
                        fontWeight: "600",
                      }}
                    >
                      <div style={{ fontSize: "11px" }}>{entry.gene || entry.rsid}</div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: "400",
                          opacity: 0.75,
                          marginTop: "2px",
                          fontFamily: "monospace",
                        }}
                      >
                        {entry.gene ? entry.rsid : ""}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {reportRows.map((row, i) => (
                  <tr
                    key={row.profile.id}
                    style={{ background: i % 2 === 0 ? "#ffffff" : "#f0f5fb" }}
                  >
                    <td
                      style={{
                        padding: "7px 12px",
                        border: "1px solid #d0dae8",
                        whiteSpace: "nowrap",
                        fontWeight: "500",
                      }}
                    >
                      {row.profile.name}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        border: "1px solid #d0dae8",
                        textAlign: "center",
                      }}
                    >
                      {computeAge(row.profile) ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        border: "1px solid #d0dae8",
                        textAlign: "center",
                      }}
                    >
                      {capitalize(row.profile.sex)}
                    </td>
                    <td
                      style={{
                        padding: "7px 12px",
                        border: "1px solid #d0dae8",
                      }}
                    >
                      {row.profile.ethnicity ?? "—"}
                    </td>
                    {readyRsids.map((entry) => (
                      <td
                        key={entry.rsid}
                        style={{
                          padding: "7px 10px",
                          border: "1px solid #d0dae8",
                          textAlign: "center",
                          fontFamily: "monospace",
                          fontWeight: "500",
                        }}
                      >
                        {row.genotypes.get(entry.rsid) ?? "--"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
