"use client"

import { useState } from "react"
import Link from "next/link"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { DeleteProfileButton } from "@/components/delete-profile-button"
import settings from "@/lib/clinic-settings.json"

function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
}

function getClinicId(name: string): string | null {
  const map = settings.profiles as Record<string, string>
  const key = Object.keys(map).find(k => k.toLowerCase() === name.toLowerCase())
  return key ? map[key] : null
}

type Tab = "all" | "personal" | (typeof settings.clinics)[number]["id"]

export function ProfilesView({ profiles }: { profiles: any[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("all")

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "all",      label: "All" },
    ...settings.clinics.map(c => ({ id: c.id as Tab, label: c.name })),
    { id: "personal", label: "Personal" },
  ]

  const filtered = profiles.filter(p => {
    if (activeTab === "all") return true
    const clinicId = getClinicId(p.name)
    if (activeTab === "personal") return clinicId === null
    return clinicId === activeTab
  })

  const counts: Record<Tab, number> = {
    all: profiles.length,
    personal: profiles.filter(p => getClinicId(p.name) === null).length,
    ...Object.fromEntries(
      settings.clinics.map(c => [
        c.id,
        profiles.filter(p => getClinicId(p.name) === c.id).length,
      ])
    ),
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Tab bar */}
      <div className="px-5 pt-4 pb-0 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              }`}>
                {counts[tab.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-5 text-center text-sm text-muted-foreground h-24 flex items-center justify-center">
          No profiles in this group.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((profile: any) => (
            <div key={profile.id} className="flex items-center gap-4 px-5 py-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold text-white shrink-0"
                style={{ background: "hsl(221 83% 53%)" }}
              >
                {getInitials(profile.name)}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profiles/${profile.id}`}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                >
                  {profile.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[profile.email, profile.sex, profile.birth_year].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <EditProfileDialog profile={profile} />
                <DeleteProfileButton id={profile.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
