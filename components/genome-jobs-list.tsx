"use client"

import { useState, useEffect, useTransition } from "react"
import { RefreshCw, CheckCircle2, XCircle, Clock, Dna, ChevronDown, ChevronUp, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getGenomeJobs, getGenomeDownloadUrl, getFullGenomeDownloadUrl, type GenomeFileJob } from "@/actions/genome"

interface GenomeJobsListProps {
  profileId: string
  initialJobs: GenomeFileJob[]
}

const STATUS_CONFIG = {
  file_processed: {
    label: "Processed",
    icon: CheckCircle2,
    className: "text-green-600",
    bg: "bg-green-50 border-green-200",
    dot: "bg-green-500",
  },
  waiting_file_processing: {
    label: "Processing",
    icon: Clock,
    className: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500 animate-pulse",
  },
  failed_file_processing: {
    label: "Failed",
    icon: XCircle,
    className: "text-red-600",
    bg: "bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
} as const

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function JobRow({ job }: { job: GenomeFileJob }) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[job.status] ?? {
    label: job.status,
    icon: Clock,
    className: "text-muted-foreground",
    bg: "bg-muted border-border",
    dot: "bg-muted-foreground",
  }
  const Icon = config.icon

  return (
    <div className={`rounded-lg border ${config.bg} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${config.className} flex items-center gap-1`}>
              <Icon className="w-3.5 h-3.5" />
              {config.label}
            </span>
            {job.file_provider && (
              <span className="text-xs text-muted-foreground">
                · {job.file_provider}
              </span>
            )}
            {job.file_chipset && (
              <span className="text-xs text-muted-foreground">
                {job.file_chipset}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {formatDate(job.created_at)}
          </p>
        </div>

        {/* ID + expand */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-muted-foreground hidden sm:block">
            {job.id.slice(0, 8)}…
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-black/5 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-black/5 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">Job ID</span>
            <p className="font-mono mt-0.5 break-all">{job.id}</p>
          </div>
          {job.finished_at && (
            <div>
              <span className="text-muted-foreground">Finished</span>
              <p className="mt-0.5">{formatDate(job.finished_at)}</p>
            </div>
          )}
          {job.error && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Error</span>
              <p className="mt-0.5 text-red-700 break-words">{job.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function GenomeJobsList({ profileId, initialJobs }: GenomeJobsListProps) {
  const [jobs, setJobs] = useState<GenomeFileJob[]>(initialJobs)
  const [isPending, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [downloading, setDownloading] = useState(false)
  const [downloadingFull, setDownloadingFull] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function handleDownload() {
    setDownloading(true)
    setDownloadError(null)
    try {
      const url = await getGenomeDownloadUrl(profileId)
      if (!url) {
        setDownloadError("No genome file available for download.")
        return
      }
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      setDownloadError("Failed to get download link. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  async function handleFullDownload() {
    setDownloadingFull(true)
    setDownloadError(null)
    try {
      const url = await getFullGenomeDownloadUrl(profileId)
      if (!url) {
        setDownloadError("Full genome file not available. It may have been archived after 14 days.")
        return
      }
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      setDownloadError("Failed to get full genome download link. Please try again.")
    } finally {
      setDownloadingFull(false)
    }
  }

  function refresh() {
    startTransition(async () => {
      try {
        const fresh = await getGenomeJobs(profileId)
        setJobs(fresh)
        setLastRefresh(new Date())
      } catch {
        // silently fail on manual refresh
      }
    })
  }

  // Auto-refresh every 10s if any job is still processing
  useEffect(() => {
    const hasProcessing = jobs.some(j => j.status === "waiting_file_processing")
    if (!hasProcessing) return
    const id = setInterval(refresh, 10_000)
    return () => clearInterval(id)
  }, [jobs])

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
          <Dna className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No genome files yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload a genome file above to get started
        </p>
      </div>
    )
  }

  const processingCount = jobs.filter(j => j.status === "waiting_file_processing").length
  const processedCount = jobs.filter(j => j.status === "file_processed").length
  const failedCount = jobs.filter(j => j.status === "failed_file_processing").length

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {processedCount > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {processedCount} processed
            </span>
          )}
          {processingCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Clock className="w-3.5 h-3.5" />
              {processingCount} processing
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-3.5 h-3.5" />
              {failedCount} failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {processedCount > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                className="h-7 px-2 text-xs gap-1.5"
              >
                <Download className={`w-3 h-3 ${downloading ? "animate-pulse" : ""}`} />
                {downloading ? "Getting link…" : "Download Raw"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullDownload}
                disabled={downloadingFull}
                className="h-7 px-2 text-xs gap-1.5"
              >
                <Download className={`w-3 h-3 ${downloadingFull ? "animate-pulse" : ""}`} />
                {downloadingFull ? "Getting link…" : "Download Full Genome"}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={isPending}
            className="h-7 px-2 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        {downloadError && (
          <p className="text-xs text-destructive mt-1 text-right">{downloadError}</p>
        )}
      </div>

      {/* Job rows */}
      <div className="space-y-2">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>

      {processingCount > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Auto-refreshing every 10 seconds while processing…
        </p>
      )}
    </div>
  )
}