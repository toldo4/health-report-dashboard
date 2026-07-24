// app/page.tsx
import Link from "next/link"
import { getProfiles } from "@/actions/profile"
import { CreateProfileDialog } from "@/components/create-profile-dialog"
import { ProfilesView } from "@/components/profiles-view"
import { BookOpen, FlaskConical } from "lucide-react"

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
            href="/prs-report"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FlaskConical className="w-4 h-4" />
            PRS Report
          </Link>
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

      <ProfilesView profiles={profiles} />
    </main>
  )
}