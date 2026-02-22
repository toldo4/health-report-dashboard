"use client"

import { useState } from "react"
import { Dna, FileText } from "lucide-react"

interface ProfileTabsProps {
  genomeCount: number
  reportCount: number
  genomeContent: React.ReactNode
  reportsContent: React.ReactNode
}

export function ProfileTabs({
  genomeCount,
  reportCount,
  genomeContent,
  reportsContent,
}: ProfileTabsProps) {
  const [active, setActive] = useState<"genome" | "reports">("genome")

  const tabs = [
    { id: "genome",  label: "Genome",  icon: Dna,      count: genomeCount  },
    { id: "reports", label: "Reports", icon: FileText,  count: reportCount  },
  ] as const

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-muted/50 p-1 rounded-lg border border-border w-fit">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${active === id
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                active === id
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "genome"  && genomeContent}
      {active === "reports" && reportsContent}
    </div>
  )
}