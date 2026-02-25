"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import {
  FlaskConical, Search, CheckCircle2, XCircle, Clock,
  Loader2, ChevronDown, ChevronUp, RefreshCw, AlertTriangle,
  Package, Microscope, Dna, Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getDnaKitJobs,
  registerDnaKit,
  lookupSampleId,
  type DnaKitJob,
  type DnaKitJobStatus,
} from "@/actions/dna-kit"

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<DnaKitJobStatus, {
  label: string; color: string; bg: string; dot: string
  icon: React.ElementType; terminal: boolean
}> = {
  shipped:            { label: "Shipped",           color: "text-sky-700",    bg: "bg-sky-50 border-sky-200",       dot: "bg-sky-400",                 icon: Package,      terminal: false },
  registered:         { label: "Registered",        color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     dot: "bg-blue-400 animate-pulse",  icon: Clock,        terminal: false },
  received_by_lab:    { label: "Received by Lab",   color: "text-violet-700", bg: "bg-violet-50 border-violet-200", dot: "bg-violet-400 animate-pulse",icon: Microscope,   terminal: false },
  analyzed_by_lab:    { label: "Analyzed by Lab",   color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", dot: "bg-indigo-400 animate-pulse",icon: Microscope,   terminal: false },
  waiting_reanalysis: { label: "Waiting Reanalysis",color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse", icon: Clock,        terminal: false },
  processing_dna_file:{ label: "Processing File",   color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400 animate-pulse", icon: Dna,          terminal: false },
  completed:          { label: "Completed",         color: "text-green-700",  bg: "bg-green-50 border-green-200",   dot: "bg-green-500",               icon: CheckCircle2, terminal: true  },
  failed:             { label: "Failed",            color: "text-red-700",    bg: "bg-red-50 border-red-200",       dot: "bg-red-500",                 icon: XCircle,      terminal: true  },
  cancelled:          { label: "Cancelled",         color: "text-gray-600",   bg: "bg-gray-50 border-gray-200",     dot: "bg-gray-400",                icon: Ban,          terminal: true  },
}

function getStatusCfg(status: string) {
  return STATUS_CFG[status as DnaKitJobStatus] ?? {
    label: status.replace(/_/g, " "), color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400",
    icon: Clock, terminal: false,
  }
}

// Progress steps for the pipeline visualization
const PIPELINE_STEPS: DnaKitJobStatus[] = [
  "registered", "received_by_lab", "analyzed_by_lab", "processing_dna_file", "completed"
]

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ─── Pipeline progress bar ────────────────────────────────────────────────────

function PipelineProgress({ status }: { status: string }) {
  if (status === "failed" || status === "cancelled" || status === "shipped") return null
  const currentIdx = PIPELINE_STEPS.indexOf(status as DnaKitJobStatus)

  return (
    <div className="flex items-center gap-1 mt-2">
      {PIPELINE_STEPS.map((step, i) => {
        const done    = i < currentIdx
        const current = i === currentIdx
        const cfg     = STATUS_CFG[step]
        return (
          <div key={step} className="flex items-center gap-1 flex-1 min-w-0">
            <div className={`h-1.5 rounded-full flex-1 transition-all ${
              done    ? "bg-green-400" :
              current ? "bg-blue-400" :
              "bg-muted"
            }`} />
            {i === PIPELINE_STEPS.length - 1 && (
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                done || current ? "bg-green-400" : "bg-muted"
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Job row ──────────────────────────────────────────────────────────────────

function KitJobRow({ job }: { job: DnaKitJob }) {
  const [expanded, setExpanded] = useState(false)
  const cfg  = getStatusCfg(job.status)
  const Icon = cfg.icon

  return (
    <div className={`rounded-lg border ${cfg.bg} overflow-hidden text-sm`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded border border-black/10">
              {job.sample_id}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Registered {fmt(job.created_at)}</p>
          <PipelineProgress status={job.status} />
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1 rounded hover:bg-black/5 text-muted-foreground shrink-0"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-black/5 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div><p className="text-muted-foreground">Job ID</p><p className="font-mono break-all mt-0.5">{job.id}</p></div>
          <div><p className="text-muted-foreground">Sample ID</p><p className="font-mono mt-0.5">{job.sample_id}</p></div>
          {job.received_by_lab_at  && <div><p className="text-muted-foreground">Received by Lab</p><p className="mt-0.5">{fmt(job.received_by_lab_at)}</p></div>}
          {job.analyzed_by_lab_at  && <div><p className="text-muted-foreground">Analyzed by Lab</p><p className="mt-0.5">{fmt(job.analyzed_by_lab_at)}</p></div>}
          {job.finished_at         && <div><p className="text-muted-foreground">Finished</p><p className="mt-0.5">{fmt(job.finished_at)}</p></div>}
          {job.error               && <div className="col-span-2"><p className="text-muted-foreground">Error</p><p className="mt-0.5 text-red-700 break-words">{job.error}</p></div>}
        </div>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function DnaKitPanel({
  profileId,
  initialJobs,
}: {
  profileId: string
  initialJobs: DnaKitJob[]
}) {
  const [jobs, setJobs]               = useState<DnaKitJob[]>(initialJobs)
  const [sampleId, setSampleId]       = useState("")
  const [lookup, setLookup]           = useState<DnaKitJob | null | "not-found">(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [regError, setRegError]       = useState<string | null>(null)
  const [regSuccess, setRegSuccess]   = useState(false)
  const [jobSearch, setJobSearch]     = useState("")
  const [isPending, startTransition]  = useTransition()
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Debounced sample ID lookup
  useEffect(() => {
    setLookup(null)
    setRegError(null)
    setRegSuccess(false)
    if (!sampleId.trim()) return
    const id = setTimeout(async () => {
      setLookupLoading(true)
      try {
        const result = await lookupSampleId(sampleId.trim())
        setLookup(result ?? "not-found")
      } catch {
        setLookup(null)
      } finally {
        setLookupLoading(false)
      }
    }, 500)
    return () => clearTimeout(id)
  }, [sampleId])

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const fresh = await getDnaKitJobs(profileId)
        setJobs(fresh)
        setLastRefresh(new Date())
      } catch { /* silent */ }
    })
  }, [profileId])

  // Auto-refresh while any job is in-progress
  useEffect(() => {
    const hasActive = jobs.some(j => !getStatusCfg(j.status).terminal)
    if (!hasActive) return
    const id = setInterval(refresh, 10_000)
    return () => clearInterval(id)
  }, [jobs, refresh])

  async function handleRegister() {
    if (!sampleId.trim()) return
    setRegistering(true)
    setRegError(null)
    setRegSuccess(false)
    try {
      const job = await registerDnaKit(profileId, sampleId.trim())
      setJobs(prev => [job, ...prev])
      setRegSuccess(true)
      setSampleId("")
      setLookup(null)
    } catch (e) {
      setRegError(e instanceof Error ? e.message : "Registration failed")
    } finally {
      setRegistering(false)
    }
  }

  // Filter jobs by search
  const q = jobSearch.trim().toLowerCase()
  const filteredJobs = q
    ? jobs.filter(j =>
        j.sample_id.toLowerCase().includes(q) ||
        getStatusCfg(j.status).label.toLowerCase().includes(q)
      )
    : jobs

  const inProgress = jobs.filter(j => !getStatusCfg(j.status).terminal).length
  const completed  = jobs.filter(j => j.status === "completed").length
  const failed     = jobs.filter(j => j.status === "failed").length

  // Determine if we can register: lookup found an unregistered kit, or no lookup yet
  const alreadyRegistered = lookup && lookup !== "not-found" && lookup.profile_id
  const canRegister = sampleId.trim() && !lookupLoading && !alreadyRegistered

  return (
    <div className="space-y-6">

      {/* ── Register a kit ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Register DNA Kit</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter the Sample ID printed on the kit to register it to this profile
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={sampleId}
                onChange={e => setSampleId(e.target.value)}
                placeholder="e.g. GFXC633223"
                className="pl-9 font-mono"
                onKeyDown={e => e.key === "Enter" && canRegister && handleRegister()}
              />
              {lookupLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button
              onClick={handleRegister}
              disabled={!canRegister || registering}
              className="gap-2 shrink-0"
            >
              {registering
                ? <><Loader2 className="w-4 h-4 animate-spin" />Registering…</>
                : <><Dna className="w-4 h-4" />Register Kit</>
              }
            </Button>
          </div>

          {/* Lookup result */}
          {lookup && lookup !== "not-found" && (
            <div className={`rounded-lg border px-3 py-2.5 text-xs flex items-start gap-2 ${
              lookup.profile_id
                ? "bg-amber-50 border-amber-200"
                : "bg-blue-50 border-blue-200"
            }`}>
              {lookup.profile_id ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Kit already registered</p>
                    <p className="text-amber-700 mt-0.5">
                      Sample <span className="font-mono">{lookup.sample_id}</span> is already linked to a profile
                      with status: <span className="font-medium">{getStatusCfg(lookup.status).label}</span>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Kit found — unregistered</p>
                    <p className="text-blue-700 mt-0.5">
                      Current status: <span className="font-medium">{getStatusCfg(lookup.status).label}</span>.
                      Ready to register to this profile.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          {lookup === "not-found" && sampleId.trim() && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Sample ID not found in the system — it will be registered fresh.
            </p>
          )}

          {/* Success */}
          {regSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-green-800 font-medium">Kit registered successfully! Tracking status below.</p>
            </div>
          )}

          {/* Error */}
          {regError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700">{regError}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Registered kits ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Registered Kits</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {jobs.length} kit{jobs.length !== 1 ? "s" : ""}
              {completed > 0 && ` · ${completed} completed`}
              {inProgress > 0 && ` · ${inProgress} in progress`}
              {failed > 0    && ` · ${failed} failed`}
            </p>
          </div>

          {/* Search */}
          {jobs.length > 0 && (
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={jobSearch}
                onChange={e => setJobSearch(e.target.value)}
                placeholder="Search kits…"
                className="pl-8 h-7 text-xs"
              />
              {jobSearch && (
                <button onClick={() => setJobSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground leading-none">
                  ×
                </button>
              )}
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={refresh} disabled={isPending} className="h-7 px-2 gap-1 text-xs shrink-0">
            <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
            <span className="text-muted-foreground text-xs hidden sm:inline">
              {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </Button>
        </div>

        <div className="p-5">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center rounded-xl border border-dashed border-border">
              <FlaskConical className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">No kits registered</p>
              <p className="text-xs text-muted-foreground mt-1">Use the form above to register a DNA kit</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No kits match "{jobSearch}"</p>
          ) : (
            <div className="space-y-2">
              {filteredJobs.map(job => <KitJobRow key={job.id} job={job} />)}
            </div>
          )}

          {inProgress > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3">Auto-refreshing every 10s…</p>
          )}
        </div>
      </div>
    </div>
  )
}