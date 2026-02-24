"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import {
  Download, RefreshCw, Search, Plus, CheckCircle2, XCircle,
  Clock, Loader2, ChevronDown, ChevronUp, AlertTriangle,
  ChevronLeft, ChevronRight, Zap, Package, FileText, Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getAllJobsPaginated,
  generateItem,
  generateBundle,
  searchReports,
  createBulkReportJobs,
  type AnyJob,
  type PaginatedJobs,
  type ReportSummary,
} from "@/actions/reports"
import { CATALOGUE, BUNDLES } from "@/lib/reports-catalogue"

const PAGE_SIZE = 15

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, {
  label: string; color: string; bg: string; dot: string
  icon: React.ElementType; terminal: boolean
}> = {
  pdf_generated:           { label: "PDF Ready",      color: "text-green-700",  bg: "bg-green-50 border-green-200",   dot: "bg-green-500",               icon: CheckCircle2, terminal: true  },
  report_generated:        { label: "Report Ready",   color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     dot: "bg-blue-500",                icon: CheckCircle2, terminal: true  },
  completed:               { label: "Completed",      color: "text-green-700",  bg: "bg-green-50 border-green-200",   dot: "bg-green-500",               icon: CheckCircle2, terminal: true  },
  waiting_pdf:             { label: "Generating PDF", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse", icon: Clock,        terminal: false },
  waiting_report_gen:      { label: "Generating",     color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse", icon: Clock,        terminal: false },
  waiting:                 { label: "Processing",     color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse", icon: Clock,        terminal: false },
  file_processed:          { label: "File Ready",     color: "text-sky-700",    bg: "bg-sky-50 border-sky-200",       dot: "bg-sky-400",                 icon: Clock,        terminal: false },
  waiting_file_processing: { label: "Processing",     color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse", icon: Clock,        terminal: false },
  init:                    { label: "Queued",         color: "text-gray-600",   bg: "bg-gray-50 border-gray-200",     dot: "bg-gray-400 animate-pulse",  icon: Clock,        terminal: false },
  failed_report_gen:       { label: "Failed",         color: "text-red-700",    bg: "bg-red-50 border-red-200",       dot: "bg-red-500",                 icon: XCircle,      terminal: true  },
  failed_pdf:              { label: "PDF Failed",     color: "text-red-700",    bg: "bg-red-50 border-red-200",       dot: "bg-red-500",                 icon: XCircle,      terminal: true  },
  failed_file_processing:  { label: "File Failed",    color: "text-red-700",    bg: "bg-red-50 border-red-200",       dot: "bg-red-500",                 icon: XCircle,      terminal: true  },
  failed:                  { label: "Failed",         color: "text-red-700",    bg: "bg-red-50 border-red-200",       dot: "bg-red-500",                 icon: XCircle,      terminal: true  },
}

function getStatusCfg(status: string) {
  return STATUS_CFG[status] ?? {
    label: status.replace(/_/g, " "), color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400",
    icon: Clock, terminal: false,
  }
}

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "catalogue" | "jobs"

// ─── Job Row ──────────────────────────────────────────────────────────────────

function JobRow({ job }: { job: AnyJob }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = getStatusCfg(job.status)
  const Icon = cfg.icon

  // Display name: prefer report_name, then job_label, then job_type
  const displayName = job.report_name ?? job.job_label

  return (
    <div className={`rounded-lg border ${cfg.bg} overflow-hidden text-sm`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate max-w-[240px]">{displayName}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
            {!cfg.terminal && job.desired_status && job.status !== job.desired_status && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                → {job.desired_status.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{fmt(job.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {job.pdf_url && (
            <a
              href={job.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md transition-colors"
            >
              <Download className="w-3 h-3" />
              PDF
            </a>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 rounded hover:bg-black/5 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-black/5 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div><p className="text-muted-foreground">Job ID</p><p className="font-mono break-all mt-0.5">{job.id}</p></div>
          <div><p className="text-muted-foreground">Type</p><p className="mt-0.5">{job.job_type}</p></div>
          {job.report_id && <div className="col-span-2"><p className="text-muted-foreground">Report ID</p><p className="font-mono break-all mt-0.5">{job.report_id}</p></div>}
          {job.finished_at && <div><p className="text-muted-foreground">Finished</p><p className="mt-0.5">{fmt(job.finished_at)}</p></div>}
          {job.error && <div className="col-span-2"><p className="text-muted-foreground">Error</p><p className="mt-0.5 text-red-700 break-words">{job.error}</p></div>}
        </div>
      )}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, pageSize, onPage }: {
  page: number; totalPages: number; total: number; pageSize: number
  onPage: (p: number) => void
}) {
  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, total)
  const pages: (number | "…")[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push("…")
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push("…")
    pages.push(totalPages)
  }
  return (
    <div className="flex items-center justify-between pt-2 border-t border-border">
      <p className="text-xs text-muted-foreground">{start}–{end} of {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) => p === "…"
          ? <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          : <button key={p} onClick={() => onPage(p as number)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
              {p}
            </button>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Catalogue tab ────────────────────────────────────────────────────────────

function CatalogueTab({ profileId, onGenerated }: { profileId: string; onGenerated: () => void }) {
  const [loadingItem, setLoadingItem]     = useState<string | null>(null)
  const [loadingBundle, setLoadingBundle] = useState<string | null>(null)
  const [errors, setErrors]               = useState<Record<string, string>>({})
  const [bundleResults, setBundleResults] = useState<Record<string, { succeeded: string[]; failed: Array<{ label: string; error: string }> } | null>>({})
  const [catalogueSearch, setCatalogueSearch] = useState("")

  // Custom (API) report search state
  const [searchQuery, setSearchQuery]         = useState("")
  const [searchResults, setSearchResults]     = useState<ReportSummary[]>([])
  const [selectedReports, setSelectedReports] = useState<ReportSummary[]>([])
  const [searching, setSearching]             = useState(false)
  const [customLoading, setCustomLoading]     = useState(false)

  // Filter catalogue by local search
  const filteredCatalogue = catalogueSearch.trim()
    ? CATALOGUE.filter(item =>
        item.label.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
        item.note?.toLowerCase().includes(catalogueSearch.toLowerCase())
      )
    : CATALOGUE

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const id = setTimeout(async () => {
      setSearching(true)
      try { setSearchResults(await searchReports(searchQuery)) }
      catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(id)
  }, [searchQuery])

  async function handleItem(itemId: string) {
    setLoadingItem(itemId)
    setErrors(e => ({ ...e, [itemId]: "" }))
    try {
      await generateItem(profileId, itemId)
      onGenerated()
    } catch (e) {
      setErrors(prev => ({ ...prev, [itemId]: e instanceof Error ? e.message : "Failed" }))
    } finally {
      setLoadingItem(null)
    }
  }

  async function handleBundle(bundleId: string) {
    setLoadingBundle(bundleId)
    setBundleResults(r => ({ ...r, [bundleId]: null }))
    try {
      const result = await generateBundle(profileId, bundleId)
      setBundleResults(r => ({ ...r, [bundleId]: result }))
      onGenerated()
    } catch (e) {
      setErrors(prev => ({ ...prev, [bundleId]: e instanceof Error ? e.message : "Failed" }))
    } finally {
      setLoadingBundle(null)
    }
  }

  async function handleCustomGenerate() {
    if (!selectedReports.length) return
    setCustomLoading(true)
    try {
      await createBulkReportJobs(profileId, selectedReports.map(r => r.id))
      setSelectedReports([])
      setSearchQuery("")
      setSearchResults([])
      onGenerated()
    } catch { /* ignore */ }
    finally { setCustomLoading(false) }
  }

  function toggleReport(r: ReportSummary) {
    setSelectedReports(prev =>
      prev.find(s => s.id === r.id) ? prev.filter(s => s.id !== r.id) : [...prev, r]
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Individual items ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Individual Reports</h3>
        </div>

        {/* Local filter */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={catalogueSearch}
            onChange={e => setCatalogueSearch(e.target.value)}
            placeholder="Filter reports…"
            className="pl-9 h-8 text-sm"
          />
          {catalogueSearch && (
            <button
              onClick={() => setCatalogueSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground leading-none text-base"
            >×</button>
          )}
        </div>

        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {filteredCatalogue.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No reports match "{catalogueSearch}"
            </div>
          ) : filteredCatalogue.map(item => {
            const isLoading = loadingItem === item.id
            const err = errors[item.id]
            return (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    {item.note && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.note}</span>
                    )}
                  </div>
                  {err && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{err}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleItem(item.id)}
                  disabled={isLoading || !!loadingItem}
                  className="gap-1.5 shrink-0"
                >
                  {isLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
                    : <><Zap className="w-3.5 h-3.5" />Generate</>
                  }
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bundles ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Bundles</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BUNDLES.map(bundle => {
            const isLoading = loadingBundle === bundle.id
            const err = errors[bundle.id]
            const result = bundleResults[bundle.id]
            const items = bundle.itemIds.map(id => CATALOGUE.find(c => c.id === id)).filter(Boolean) as typeof CATALOGUE

            return (
              <div key={bundle.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{bundle.label}</p>
                  {bundle.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{bundle.description}</p>
                  )}
                </div>

                {/* Item list */}
                <div className="space-y-1">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* Result feedback */}
                {result && (
                  <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs space-y-1">
                    {result.succeeded.length > 0 && (
                      <p className="text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {result.succeeded.length} started successfully
                      </p>
                    )}
                    {result.failed.map(f => (
                      <p key={f.label} className="text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />{f.label}: {f.error}
                      </p>
                    ))}
                  </div>
                )}
                {err && (
                  <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{err}</p>
                )}

                <Button
                  size="sm"
                  onClick={() => handleBundle(bundle.id)}
                  disabled={isLoading || !!loadingBundle}
                  className="gap-1.5 w-full"
                >
                  {isLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating Bundle…</>
                    : <><Sparkles className="w-3.5 h-3.5" />Generate {bundle.label}</>
                  }
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Custom API search ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Custom Report Search</h3>
          <span className="text-xs text-muted-foreground">— find any specific report by name</span>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search report name…"
              className="pl-9"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {searchResults.length > 0 && (
            <div className="rounded-lg border border-border bg-card max-h-48 overflow-y-auto divide-y divide-border">
              {searchResults.map(r => {
                const isSel = !!selectedReports.find(s => s.id === r.id)
                return (
                  <button key={r.id} onClick={() => toggleReport(r)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors ${isSel ? "bg-blue-50" : ""}`}>
                    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${isSel ? "bg-blue-500 border-blue-500" : "border-border"}`}>
                      {isSel && <div className="w-2 h-2 rounded-sm bg-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      {r.area?.length > 0 && <p className="text-xs text-muted-foreground truncate">{r.area.join(", ")}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{r.report_type}</span>
                  </button>
                )
              })}
            </div>
          )}

          {selectedReports.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedReports.map(r => (
                <span key={r.id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {r.name}
                  <button onClick={() => toggleReport(r)} className="hover:text-blue-600 font-bold ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}

          {selectedReports.length > 0 && (
            <Button size="sm" onClick={handleCustomGenerate} disabled={customLoading} className="gap-2">
              {customLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
                : <><Plus className="w-3.5 h-3.5" />Generate {selectedReports.length} Report{selectedReports.length !== 1 ? "s" : ""}</>
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Jobs tab ─────────────────────────────────────────────────────────────────

function JobsTab({ profileId, initialData }: { profileId: string; initialData: PaginatedJobs }) {
  const [data, setData]             = useState<PaginatedJobs>(initialData)
  const [isPending, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const loadPage = useCallback((page: number) => {
    startTransition(async () => {
      try {
        const fresh = await getAllJobsPaginated(profileId, page, PAGE_SIZE)
        setData(fresh)
        setLastRefresh(new Date())
      } catch { /* silent */ }
    })
  }, [profileId])

  const refresh = useCallback(() => loadPage(data.page), [loadPage, data.page])

  // Auto-refresh while any in-progress
  useEffect(() => {
    const hasActive = data.jobs.some(j => !getStatusCfg(j.status).terminal)
    if (!hasActive) return
    const id = setInterval(refresh, 10_000)
    return () => clearInterval(id)
  }, [data.jobs, refresh])

  const inProgress = data.jobs.filter(j => !getStatusCfg(j.status).terminal).length
  const pdfReady   = data.jobs.filter(j => j.pdf_url).length
  const failed     = data.jobs.filter(j => j.status.startsWith("failed")).length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground flex-1">
          {data.total} total job{data.total !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-3 text-xs">
          {inProgress > 0 && <span className="text-amber-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{inProgress} in progress</span>}
          {pdfReady   > 0 && <span className="text-green-600 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{pdfReady} PDFs</span>}
          {failed     > 0 && <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{failed} failed</span>}
          <span className="text-muted-foreground">{lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={isPending} className="h-7 px-2 gap-1 text-xs">
          <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {data.jobs.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center rounded-xl border border-dashed border-border">
          <FileText className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No jobs yet</p>
          <p className="text-xs text-muted-foreground mt-1">Generate reports from the Catalogue tab</p>
        </div>
      ) : (
        <>
          {isPending
            ? <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
            : <div className="space-y-2">{data.jobs.map(j => <JobRow key={j.id} job={j} />)}</div>
          }
          {data.totalPages > 1 && (
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={PAGE_SIZE} onPage={loadPage} />
          )}
        </>
      )}

      {inProgress > 0 && (
        <p className="text-xs text-muted-foreground text-center">Auto-refreshing every 10s…</p>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ReportJobsPanel({
  profileId,
  initialJobs,
}: {
  profileId: string
  initialJobs: AnyJob[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>("catalogue")
  const [jobsData, setJobsData]   = useState<PaginatedJobs>({
    jobs: initialJobs.slice(0, PAGE_SIZE),
    total: initialJobs.length,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(initialJobs.length / PAGE_SIZE)),
  })
  const [, startTransition] = useTransition()

  function refreshJobs() {
    startTransition(async () => {
      try {
        const fresh = await getAllJobsPaginated(profileId, 1, PAGE_SIZE)
        setJobsData(fresh)
      } catch { /* silent */ }
    })
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType; count?: number }> = [
    { id: "catalogue", label: "Catalogue",    icon: Package  },
    { id: "jobs",      label: "Jobs",         icon: FileText, count: jobsData.total },
  ]

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg border border-border w-fit">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {typeof count === "number" && count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "catalogue" && (
        <CatalogueTab
          profileId={profileId}
          onGenerated={() => {
            refreshJobs()
            setActiveTab("jobs")
          }}
        />
      )}
      {activeTab === "jobs" && (
        <JobsTab profileId={profileId} initialData={jobsData} />
      )}
    </div>
  )
}