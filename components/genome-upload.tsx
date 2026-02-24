"use client"

import { useState, useRef } from "react"
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPresignedUploadUrl, createGenomeFileJob } from "@/actions/genome"

interface GenomeUploadProps {
  profileId: string
  onSuccess?: () => void
}

type UploadStep = "idle" | "getting-url" | "uploading" | "creating-job" | "done" | "error"

export function GenomeUpload({ profileId, onSuccess }: GenomeUploadProps) {
  const [step, setStep] = useState<UploadStep>("idle")
  const [progress, setProgress] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(selected: File) {
    setFile(selected)
    setStep("idle")
    setError(null)
    setProgress(0)
  }

  async function handleUpload() {
    if (!file) return
    setError(null)

    try {
      // Step 1: Get presigned URL from our server action
      setStep("getting-url")
      const { url, fields, file_id } = await getPresignedUploadUrl()

      // Step 2: Upload file directly to S3 using XHR (for progress tracking)
      setStep("uploading")
      await new Promise<void>((resolve, reject) => {
        const formData = new FormData()
        // S3 requires fields to come BEFORE the file
        Object.entries(fields).forEach(([k, v]) => formData.append(k, v))
        formData.append("file", file)

        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`S3 upload failed: ${xhr.status}`))
        })
        xhr.addEventListener("error", () => reject(new Error("Network error during upload")))
        xhr.open("POST", url)
        xhr.send(formData)
      })

      // Step 3: Create genome file job
      setStep("creating-job")
      await createGenomeFileJob(profileId, file_id)

      setStep("done")
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
      setStep("error")
    }
  }

  function reset() {
    setStep("idle")
    setFile(null)
    setError(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ""
  }

  const isLoading = ["getting-url", "uploading", "creating-job"].includes(step)

  if (step === "done") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
        <div>
          <p className="font-medium text-green-900">Upload complete</p>
          <p className="text-sm text-green-700 mt-0.5">
            Genome file queued for processing. Check the status below.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="mt-1">
          Upload another file
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`
          relative rounded-xl border-2 border-dashed transition-colors cursor-pointer
          ${dragging ? "border-blue-400 bg-blue-50" : "border-border hover:border-blue-300 hover:bg-muted/40"}
          ${file ? "bg-muted/30" : ""}
        `}
        onClick={() => !isLoading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const dropped = e.dataTransfer.files[0]
          if (dropped) handleFileSelect(dropped)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".txt,.zip,.csv,.vcf,.gz"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          disabled={isLoading}
        />

        <div className="p-8 flex flex-col items-center gap-3 text-center">
          {file ? (
            <>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isLoading && (
                <button
                  className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); reset() }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drop your genome file here
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  23andMe, AncestryDNA, VCF — .txt, .zip, .csv, .vcf, .gz
                </p>
              </div>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {step === "uploading" && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading to secure storage…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status text for other steps */}
      {step === "getting-url" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Preparing secure upload…
        </p>
      )}
      {step === "creating-job" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Registering file for processing…
        </p>
      )}

      {/* Error */}
      {step === "error" && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Upload button */}
      {file && !isLoading && (
        <Button onClick={handleUpload} className="w-full gap-2">
          <Upload className="w-4 h-4" />
          Upload Genome File
        </Button>
      )}
    </div>
  )
}