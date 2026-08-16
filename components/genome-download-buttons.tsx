"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getGenomeDownloadUrl,
  getFullGenomeDownloadUrl,
  getWgsFastqDownloadUrls,
} from "@/actions/genome"

interface GenomeDownloadButtonsProps {
  profileId: string
}

function triggerDownload(url: string) {
  const link = document.createElement("a")
  link.href = url
  link.download = ""
  link.rel = "noopener noreferrer"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const DOWNLOADS = [
  {
    key: "raw",
    label: "Download Genome File",
    notFoundMessage: "No genome file available for download.",
    errorMessage: "Failed to get download link. Please try again.",
    fetchUrls: async (profileId: string) => {
      const url = await getGenomeDownloadUrl(profileId)
      return url ? [url] : null
    },
  },
  {
    key: "full",
    label: "Download Full Genome (VCF)",
    notFoundMessage: "Full genome file not available. It may have been archived after 14 days.",
    errorMessage: "Failed to get full genome download link. Please try again.",
    fetchUrls: async (profileId: string) => {
      const url = await getFullGenomeDownloadUrl(profileId)
      return url ? [url] : null
    },
  },
  {
    key: "wgs",
    label: "Download WGS FASTQ",
    notFoundMessage: "WGS FASTQ files not available for this profile.",
    errorMessage: "Failed to get WGS FASTQ download link. Please try again.",
    fetchUrls: async (profileId: string) => getWgsFastqDownloadUrls(profileId),
  },
] as const

export function GenomeDownloadButtons({ profileId }: GenomeDownloadButtonsProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload(option: (typeof DOWNLOADS)[number]) {
    setPendingKey(option.key)
    setError(null)
    try {
      const urls = await option.fetchUrls(profileId)
      if (!urls || urls.length === 0) {
        setError(option.notFoundMessage)
        return
      }
      urls.forEach(triggerDownload)
    } catch {
      setError(option.errorMessage)
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div className="space-y-2">
      {DOWNLOADS.map((option) => (
        <Button
          key={option.key}
          variant="outline"
          size="sm"
          onClick={() => handleDownload(option)}
          disabled={pendingKey === option.key}
          className="w-full justify-start gap-1.5 text-xs"
        >
          <Download className={`w-3.5 h-3.5 ${pendingKey === option.key ? "animate-pulse" : ""}`} />
          {pendingKey === option.key ? "Getting link…" : option.label}
        </Button>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
