// app/page.tsx
import { getProfiles } from "@/actions/profile"
import { CreateProfileDialog } from "@/components/create-profile-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function DashboardPage() {
  // Fetch profiles server-side
  const profiles = await getProfiles()

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SelfDecode Profiles</h1>
          <p className="text-muted-foreground mt-2">Manage user profiles and genome files.</p>
        </div>
        <CreateProfileDialog />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Birth Year</TableHead>
              <TableHead>ID</TableHead>
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
                  <TableCell className="font-medium">{profile.name}</TableCell>
                  <TableCell>{profile.email || "—"}</TableCell>
                  <TableCell>{profile.sex}</TableCell>
                  <TableCell>{profile.birth_year}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {profile.id}
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