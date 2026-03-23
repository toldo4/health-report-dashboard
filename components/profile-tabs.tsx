"use client"

import { useState } from "react"
import { Dna, FileText, FlaskConical, Microscope } from "lucide-react"

interface ProfileTabsProps {
  genomeCount:    number
  reportCount:    number
  kitCount:       number
  orderCount:     number
  genomeContent:  React.ReactNode
  reportsContent: React.ReactNode
  kitContent:     React.ReactNode
  ordersContent:  React.ReactNode
  genesContent:   React.ReactNode
}

type TabId = "genome" | "reports" | "dna-kit" | "genes"

export function ProfileTabs({
  genomeCount,
  reportCount,
  kitCount,
  genomeContent,
  reportsContent,
  kitContent,
  ordersContent,
  genesContent,
}: ProfileTabsProps) {
  const [active, setActive] = useState<TabId>("dna-kit")

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType; count?: number }> = [
    { id: "dna-kit",  label: "DNA Kits", icon: FlaskConical, count: kitCount     },
    { id: "genome",   label: "Genome",   icon: Dna,          count: genomeCount  },
    { id: "reports",  label: "Reports",  icon: FileText,     count: reportCount  },
    { id: "genes",    label: "Genes",    icon: Microscope                        },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-4 bg-muted/50 p-1 rounded-lg border border-border w-full">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${active === id
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count !== undefined && count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                active === id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {active === "genome"  && genomeContent}
      {active === "reports" && reportsContent}
      {active === "genes"   && genesContent}
      {active === "dna-kit" && (
        <div className="space-y-6">
          {ordersContent}
          {kitContent}
        </div>
      )}
    </div>
  )
}
