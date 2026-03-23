// app/page.tsx
import Link from "next/link"
import { getProfiles } from "@/actions/profile"
import { CreateProfileDialog } from "@/components/create-profile-dialog"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { DeleteProfileButton } from "@/components/delete-profile-button"
import { BookOpen } from "lucide-react"

function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
}

export default async function DashboardPage() {
  const profiles = await getProfiles()

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Nutrigenix Profiles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage user profiles and genome files.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Articles
          </Link>
          <CreateProfileDialog />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {profiles.length === 0 ? (
          <div className="p-5 text-center text-sm text-muted-foreground h-24 flex items-center justify-center">
            No profiles found. Create one to get started.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {profiles.map((profile: any) => (
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
    </main>
  )
}