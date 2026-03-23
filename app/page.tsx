// app/page.tsx
import Link from "next/link"
import { getProfiles } from "@/actions/profile"
import { CreateProfileDialog } from "@/components/create-profile-dialog"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { DeleteProfileButton } from "@/components/delete-profile-button"
import { BookOpen } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function DashboardPage() {
  const profiles = await getProfiles()

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nutrigenix Profiles</h1>
          <p className="text-muted-foreground mt-2">Manage user profiles and genome files.</p>
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Birth Year</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No profiles found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((profile: any) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/profiles/${profile.id}`}
                      className="hover:underline text-primary"
                    >
                      {profile.name}
                    </Link>
                  </TableCell>
                  <TableCell>{profile.email || "—"}</TableCell>
                  <TableCell>{profile.sex}</TableCell>
                  <TableCell>{profile.birth_year}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <EditProfileDialog profile={profile} />
                    <DeleteProfileButton id={profile.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}