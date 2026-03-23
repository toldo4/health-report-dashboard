"use client"

import { useState, useEffect, useTransition } from "react"
import { User, ChevronDown, Loader2, Dna, AlertCircle } from "lucide-react"
import { getProfiles } from "@/actions/profile"
import { getSNPsByRsids, getGenotypes, type SNPSummary, type SNPGenotype } from "@/actions/gene"
import { computePersonalizedFrequency, getEthnicityKey } from "@/lib/gene-utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  name: string
  ethnicity?: string | null
}

// ─── Impact Bar ───────────────────────────────────────────────────────────────

function ImpactBar({ score }: { score: number }) {
  const filled = Math.max(1, Math.round(score * 4))
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`h-2 w-5 rounded-sm ${i < filled ? "bg-violet-500" : "bg-muted"}`} />
      ))}
    </div>
  )
}

// ─── SNP Table ────────────────────────────────────────────────────────────────

function PersonalizedSNPTable({
  snps,
  genotypes,
  ethnicity,
}: {
  snps: SNPSummary[]
  genotypes: SNPGenotype[]
  ethnicity?: string | null
}) {
  const genotypeMap = new Map(genotypes.map((g) => [g.rsid, g]))
  const ethnicityKey = getEthnicityKey(ethnicity)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-violet-200 bg-violet-50">
            {["Variant", "Genotype", "Frequency", "Alternative Allele", "Impact"].map((h) => (
              <th key={h} className="py-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snps.map((snp) => {
            const genotype = genotypeMap.get(snp.rsid)
            const genotypeStr = genotype?.genotypes?.join(", ") ?? "/"

            const freq = genotype
              ? computePersonalizedFrequency(snp, genotype.genotypes, ethnicityKey)
              : null
            const freqStr = freq !== null ? `${Math.round(freq * 100)}%` : "/"

            const isAlt = genotype?.variant_ids?.some((v) => v !== "ref")

            return (
              <tr key={snp.rsid} className="border-b border-violet-100 hover:bg-violet-50/50 transition-colors">
                <td className="py-3 px-4">
                  <a
                    href={`https://selfdecode.com/snp/${snp.rsid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    {snp.rsid}
                  </a>
                </td>
                <td className="py-3 px-4 text-sm font-mono text-foreground">{genotypeStr}</td>
                <td className="py-3 px-4 text-sm text-foreground">{freqStr}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {snp.alts.slice(0, 4).map((alt, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold border ${
                          isAlt
                            ? "bg-violet-500 text-white border-violet-500"
                            : "bg-violet-100 text-violet-700 border-violet-200"
                        }`}
                      >
                        {alt.length === 1 ? alt : alt.slice(0, 1)}
                      </span>
                    ))}
                    {snp.alts.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{snp.alts.length - 4}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <ImpactBar score={snp.overall_score} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Profile Selector ─────────────────────────────────────────────────────────

function ProfileSelector({
  profiles,
  selected,
  onSelect,
}: {
  profiles: Profile[]
  selected: Profile | null
  onSelect: (p: Profile) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
      >
        <User className="w-3.5 h-3.5 text-muted-foreground" />
        <span>{selected ? selected.name : "Select profile"}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-56 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {profiles.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No profiles found</p>
          ) : (
            profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${
                  selected?.id === p.id ? "bg-violet-50 text-violet-700 font-medium" : "text-foreground"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-violet-700">
                    {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="truncate">{p.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PersonalizedSNPSectionProps {
  rsids: string[]
}

export function PersonalizedSNPSection({ rsids }: PersonalizedSNPSectionProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [snps, setSnps] = useState<SNPSummary[]>([])
  const [genotypes, setGenotypes] = useState<SNPGenotype[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Load profiles on mount
  useEffect(() => {
    getProfiles()
      .then((data) => setProfiles(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => setError("Failed to load profiles"))
      .finally(() => setProfilesLoading(false))
  }, [])

  // Load SNP summaries once — fetch directly by rsid, no gene slug needed
  useEffect(() => {
    if (rsids.length === 0) return
    startTransition(async () => {
      try {
        const allSnps = await getSNPsByRsids(rsids)
        // Preserve the order from rsids
        const ordered = rsids
          .map((id) => allSnps.find((s) => s.rsid === id))
          .filter(Boolean) as SNPSummary[]
        setSnps(ordered)
      } catch {
        setSnps([])
      }
    })
  }, [rsids.join(",")])

  // Load genotypes when profile changes
  useEffect(() => {
    if (!selectedProfile || rsids.length === 0) {
      setGenotypes([])
      return
    }
    startTransition(async () => {
      try {
        const data = await getGenotypes(selectedProfile.id, rsids)
        setGenotypes(data)
      } catch {
        setError("Failed to load genotype data")
      }
    })
  }, [selectedProfile?.id])

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/30 overflow-hidden my-6">
      {/* Header */}
      <div className="px-4 py-3 border-b border-violet-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Your Personalized SNP Table</span>
        </div>

        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {profilesLoading ? (
            <div className="h-8 w-36 bg-muted rounded-lg animate-pulse" />
          ) : (
            <ProfileSelector
              profiles={profiles}
              selected={selectedProfile}
              onSelect={setSelectedProfile}
            />
          )}
        </div>
      </div>

      {/* Body — always min height so profile selector stays reachable */}
      <div className="min-h-[160px]">
        {error && (
          <div className="h-full flex items-center justify-center p-4 gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* No profile selected */}
        {!selectedProfile && !error && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6 py-8">
            <div className="w-12 h-12 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center">
              <Dna className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Select a profile to see personalized results</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Choose a profile from the dropdown above to view your genotype and frequency for these SNPs
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-3 py-1.5 animate-pulse">
              <User className="w-3 h-3" />
              Select profile above
            </div>
          </div>
        )}

        {/* Loading */}
        {selectedProfile && isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading personalized data…
          </div>
        )}

        {/* SNPs loaded — show table */}
        {selectedProfile && !isPending && snps.length > 0 && (
          <PersonalizedSNPTable
            snps={snps}
            genotypes={genotypes}
            ethnicity={selectedProfile.ethnicity}
          />
        )}

        {/* Profile selected but no SNP data found */}
        {selectedProfile && !isPending && snps.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-6">
            <p className="text-sm text-muted-foreground">No SNP data found for this gene in the current section.</p>
          </div>
        )}
      </div>
    </div>
  )
}