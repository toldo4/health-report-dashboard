"use client"

import { useState } from "react"
import { Dna, FileText, FlaskConical, Microscope } from "lucide-react"

interface ProfileTabsProps {
  genomeContent:  React.ReactNode
  reportsContent: React.ReactNode
  kitContent:     React.ReactNode
  genesContent:   React.ReactNode
}

type TabId = "dna-kit" | "genome" | "reports" | "genes"

export function ProfileTabs({
  genomeContent,
  reportsContent,
  kitContent,
  genesContent,
}: ProfileTabsProps) {
  const [active, setActive] = useState<TabId>("dna-kit")

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: "dna-kit",  label: "DNA Kits", icon: FlaskConical },
    { id: "genome",   label: "Genome",   icon: Dna          },
    { id: "reports",  label: "Reports",  icon: FileText     },
    { id: "genes",    label: "Genes",    icon: Microscope   },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-4 bg-muted/50 p-1 rounded-lg border border-border w-full">
        {tabs.map(({ id, label, icon: Icon }) => (
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
          </button>
        ))}
      </div>

      {active === "dna-kit"  && kitContent}
      {active === "genome"   && genomeContent}
      {active === "reports"  && reportsContent}
      {active === "genes"    && genesContent}
    </div>
  )
}
