// app/profiles/[id]/page.tsx
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Ruler, Weight, Globe, Mail, User, Dna, FlaskConical } from "lucide-react"
import { getProfile } from "@/actions/profile"
import { getGenomeJobs } from "@/actions/genome"
import { getAllJobs } from "@/actions/reports"
import { getDnaKitJobs } from "@/actions/dna-kit"
import { getOrderRows } from "@/actions/orders"
import { GenomeUpload } from "@/components/genome-upload"
import { GenomeJobsList } from "@/components/genome-jobs-list"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { ReportJobsPanel } from "@/components/report-jobs-panel"
import { DnaKitPanel } from "@/components/dna-kit-panel"
import { OrdersPanel } from "@/components/orders-panel"
import { ProfileTabs } from "@/components/profile-tabs"

function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: React.ReactNode
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [profile, genomeJobs, reportJobs, kitJobs, orderRows] = await Promise.all([
    getProfile(id).catch(() => null),
    getGenomeJobs(id).catch(() => []),
    getAllJobs(id).catch(() => []),
    getDnaKitJobs(id).catch(() => []),
    getOrderRows().catch(() => []),
  ])

  if (!profile) notFound()

  const hasProcessedGenome = genomeJobs.some((j: any) => j.status === "file_processed")
  const pdfCount           = reportJobs.filter((j: any) => j.pdf_url).length
  const completedKits      = kitJobs.filter((j: any) => j.status === "completed").length

  const birthDateStr = [
    profile.birth_year,
    profile.birth_month
      ? new Date(0, profile.birth_month - 1).toLocaleString("en", { month: "long" })
      : null,
    profile.birth_day,
  ].filter(Boolean).reverse().join(" ")

  const genomeContent = (
    <div className="space-y-6">
      <SectionCard title="Upload Genome File" description="Supports 23andMe, AncestryDNA, and VCF formats">
        <GenomeUpload profileId={profile.id} />
      </SectionCard>
      <SectionCard
        title="Genome Files"
        description={`${genomeJobs.length} file${genomeJobs.length !== 1 ? "s" : ""} uploaded`}
      >
        <GenomeJobsList profileId={profile.id} initialJobs={genomeJobs} />
      </SectionCard>
    </div>
  )

  const reportsContent = (
    <SectionCard
      title="Report Jobs"
      description={`${reportJobs.length} job${reportJobs.length !== 1 ? "s" : ""}${pdfCount > 0 ? ` · ${pdfCount} PDFs ready` : ""}`}
    >
      <ReportJobsPanel profileId={profile.id} initialJobs={reportJobs} />
    </SectionCard>
  )

  const kitContent = (
    <DnaKitPanel profileId={profile.id} initialJobs={kitJobs} />
  )

  const ordersContent = (
    <OrdersPanel profileId={profile.id} initialRows={orderRows} />
  )

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profiles
      </Link>

      <div className="flex items-start gap-5 mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-semibold text-white shrink-0"
          style={{ background: "hsl(221 83% 53%)" }}
        >
          {getInitials(profile.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">{profile.name}</h1>
            {hasProcessedGenome && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                <Dna className="w-3 h-3" /> Genome ready
              </span>
            )}
            {pdfCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                {pdfCount} PDF{pdfCount > 1 ? "s" : ""} ready
              </span>
            )}
            {completedKits > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                <FlaskConical className="w-3 h-3" /> {completedKits} kit{completedKits > 1 ? "s" : ""} complete
              </span>
            )}
          </div>
          {profile.email && <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>}
          <p className="text-xs text-muted-foreground font-mono mt-1">{profile.id}</p>
        </div>
        <EditProfileDialog profile={profile} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SectionCard title="Profile Details">
            <InfoRow icon={User}     label="Biological Sex"      value={profile.sex} />
            <InfoRow icon={Calendar} label="Date of Birth"       value={birthDateStr || profile.birth_year} />
            <InfoRow icon={Ruler}    label="Height"              value={profile.height ? `${profile.height} cm` : null} />
            <InfoRow icon={Weight}   label="Weight"              value={profile.weight ? `${profile.weight} kg` : null} />
            <InfoRow icon={Mail}     label="Email"               value={profile.email} />
            <InfoRow icon={Globe}    label="Primary Ethnicity"   value={profile.ethnicity} />
            <InfoRow icon={Globe}    label="Secondary Ethnicity" value={profile.secondary_ethnicity} />
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <ProfileTabs
            genomeCount={genomeJobs.length}
            reportCount={reportJobs.length}
            kitCount={kitJobs.length}
            orderCount={orderRows.length}
            genomeContent={genomeContent}
            reportsContent={reportsContent}
            kitContent={kitContent}
            ordersContent={ordersContent}
          />
        </div>
      </div>
    </div>
  )
}