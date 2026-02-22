"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import {
  FileText, Download, RefreshCw, Zap, Search, Plus,
  CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp,
  AlertTriangle, ChevronLeft, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getReportJobsPaginated,
  generateAllReports,
  createBulkReportJobs,
  searchReports,
  type ReportJob,
  type ReportSummary,
  type PaginatedReportJobs,
} from "@/actions/reports"

const PAGE_SIZE = 15

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; dot: string
  icon: React.ElementType; terminal: boolean
}> = {
  pdf_generated:           { label: "PDF Ready",       color: "text-green-700",  bg: "bg-green-50 border-green-200",   dot: "bg-green-500",               icon: CheckCircle2, terminal: true  },
  report_generated:        { label: "Report Ready",    color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     dot: "bg-blue-500",                icon: CheckCircle2, terminal: true  },
  waiting_pdf:             { label: "Generating PDF",  color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse", icon: Clock,        terminal: false },
  waiting_report_gen:      { label: "Generating",      color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse", icon: Clock,        terminal: false },
  file_processed:          { label: "File Ready",      color: "text-sky-700",    bg: "bg-sky-50 border-sky-200",       dot: "bg-sky-400",                 icon: Clock,        terminal: false },
  waiting_file_processing: { label: "Processing",      color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse", icon: Clock,        terminal: false },
  failed_report_gen:       { label: "Failed",          color: "text-red-700",    bg: "bg-red-50 border-red-200",       dot: "bg-red-500",                 icon: XCircle,      terminal: true  },
  failed_pdf:              { label: "PDF Failed",      color: "text-red-700",    bg: "bg-red-50 border-red-200",       dot: "bg-red-500",                 icon: XCircle,      terminal: true  },
  failed_file_processing:  { label: "File Failed",     color: "text-red-700",    bg: "bg-red-50 border-red-200",       dot: "bg-red-500",                 icon: XCircle,      terminal: true  },
  init:                    { label: "Queued",          color: "text-gray-600",   bg: "bg-gray-50 border-gray-200",     dot: "bg-gray-400 animate-pulse",  icon: Clock,        terminal: false },
}

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? {
    label: status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200",
    dot: "bg-gray-400", icon: Clock, terminal: false,
  }
}

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ─── Job row ──────────────────────────────────────────────────────────────────

function JobRow({ job }: { job: ReportJob }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = getStatusCfg(job.status)
  const Icon = cfg.icon

  return (
    <div className={`rounded-lg border ${cfg.bg} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Report name — prominent */}
            <span className="text-sm font-medium text-foreground truncate max-w-xs">
              {job.report_name ?? <span className="text-muted-foreground italic">Unknown report</span>}
            </span>
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${cfg.color}`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
            {/* Desired status arrow if still in progress */}
            {!cfg.terminal && job.desired_status && job.status !== job.desired_status && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                → {job.desired_status.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{fmt(job.created_at)}</p>
        </div>

        {/* Actions */}
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
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-black/5 text-muted-foreground"
            title="Details"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-black/5 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div>
            <p className="text-muted-foreground">Job ID</p>
            <p className="font-mono break-all mt-0.5">{job.id}</p>
          </div>
          {job.report_id && (
            <div>
              <p className="text-muted-foreground">Report ID</p>
              <p className="font-mono break-all mt-0.5">{job.report_id}</p>
            </div>
          )}
          {job.finished_at && (
            <div>
              <p className="text-muted-foreground">Finished</p>
              <p className="mt-0.5">{fmt(job.finished_at)}</p>
            </div>
          )}
          {job.error && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Error</p>
              <p className="mt-0.5 text-red-700 break-words">{job.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Pagination controls ──────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, pageSize, onPage }: {
  page: number; totalPages: number; total: number; pageSize: number
  onPage: (p: number) => void
}) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  // Build page numbers with ellipsis
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
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">
        {start}–{end} of {total} jobs
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Report search ────────────────────────────────────────────────────────────

function ReportSearch({ profileId, onJobsCreated }: {
  profileId: string; onJobsCreated: () => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ReportSummary[]>([])
  const [selected, setSelected] = useState<ReportSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const id = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchReports(query)
        setResults(res.filter(r => !r.is_deprecated).slice(0, 20))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(id)
  }, [query])

  function toggle(r: ReportSummary) {
    setSelected(prev =>
      prev.find(s => s.id === r.id) ? prev.filter(s => s.id !== r.id) : [...prev, r]
    )
  }

  async function handleGenerate() {
    if (!selected.length) return
    setError(null)
    setSubmitting(true)
    try {
      await createBulkReportJobs(profileId, selected.map(r => r.id))
      setSelected([])
      setQuery("")
      setResults([])
      onJobsCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create jobs")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search reports by name…"
          className="pl-9"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border border-border bg-card max-h-52 overflow-y-auto divide-y divide-border">
          {results.map(r => {
            const isSel = !!selected.find(s => s.id === r.id)
            return (
              <button
                key={r.id}
                onClick={() => toggle(r)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors ${isSel ? "bg-blue-50" : ""}`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSel ? "bg-blue-500 border-blue-500" : "border-border"}`}>
                  {isSel && <div className="w-2 h-2 rounded-sm bg-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                  {r.area?.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">{r.area.join(", ")}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{r.report_type}</span>
              </button>
            )
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(r => (
            <span key={r.id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
              {r.name}
              <button onClick={() => toggle(r)} className="hover:text-blue-600 ml-0.5 font-bold">×</button>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {selected.length > 0 && (
        <Button onClick={handleGenerate} disabled={submitting} size="sm" className="gap-2">
          {submitting
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
            : <><Plus className="w-3.5 h-3.5" />Generate {selected.length} Report{selected.length !== 1 ? "s" : ""}</>
          }
        </Button>
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
  initialJobs: ReportJob[]
}) {
  const initialTotal = initialJobs.length
  const initialPages = Math.max(1, Math.ceil(initialTotal / PAGE_SIZE))

  const [paginated, setPaginated] = useState<PaginatedReportJobs>({
    jobs: initialJobs.slice(0, PAGE_SIZE),
    total: initialTotal,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: initialPages,
  })
  const [isPending, startTransition] = useTransition()
  const [generatingAll, setGeneratingAll] = useState(false)
  const [generateAllError, setGenerateAllError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const loadPage = useCallback((page: number) => {
    startTransition(async () => {
      try {
        const data = await getReportJobsPaginated(profileId, page, PAGE_SIZE)
        setPaginated(data)
        setLastRefresh(new Date())
      } catch { /* silent */ }
    })
  }, [profileId])

  const refresh = useCallback(() => loadPage(paginated.page), [loadPage, paginated.page])

  // Auto-refresh while jobs in progress
  useEffect(() => {
    const hasInProgress = paginated.jobs.some(j => !getStatusCfg(j.status).terminal)
    if (!hasInProgress) return
    const id = setInterval(refresh, 10_000)
    return () => clearInterval(id)
  }, [paginated.jobs, refresh])

  async function handleGenerateAll() {
    setGenerateAllError(null)
    setGeneratingAll(true)
    try {
      await generateAllReports(profileId, "pdf_generated")
      loadPage(1)
    } catch (e) {
      setGenerateAllError(e instanceof Error ? e.message : "Failed")
    } finally {
      setGeneratingAll(false)
    }
  }

  const { jobs, total, page, totalPages } = paginated
  const pdfReady   = jobs.filter(j => j.pdf_url).length
  const inProgress = jobs.filter(j => !getStatusCfg(j.status).terminal).length
  const failed     = jobs.filter(j => j.status.startsWith("failed")).length

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* <Button onClick={handleGenerateAll} disabled={generatingAll} size="sm" className="gap-2">
          {generatingAll
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Starting…</>
            : <><Zap className="w-3.5 h-3.5" />Generate All Reports</>
          }
        </Button> */}

        <div className="flex items-center gap-3 ml-auto text-xs">
          {inProgress > 0 && <span className="text-amber-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{inProgress} in progress</span>}
          {pdfReady   > 0 && <span className="text-green-600 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{pdfReady} PDFs ready</span>}
          {failed     > 0 && <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{failed} failed</span>}
          <span className="text-muted-foreground">{lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={isPending} className="h-7 px-2 gap-1 text-xs">
            <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {generateAllError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {generateAllError}
        </div>
      )}

      {/* Search */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium text-foreground mb-3">Generate Specific Reports</p>
        <ReportSearch profileId={profileId} onJobsCreated={() => loadPage(1)} />
      </div>

      {/* Jobs list */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No report jobs yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click "Generate All Reports" or search for specific reports above
          </p>
        </div>
      ) : (
        <>
          {isPending ? (
            <div className="space-y-2">
              {[...Array(Math.min(jobs.length, 5))].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => <JobRow key={job.id} job={job} />)}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPage={loadPage}
            />
          )}
        </>
      )}

      {inProgress > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Auto-refreshing every 10 seconds while jobs are in progress…
        </p>
      )}
    </div>
  )
}