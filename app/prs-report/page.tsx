import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getProfiles } from "@/actions/profile"
import { PrsReportBuilder } from "@/components/prs-report-builder"

export default async function PrsReportPage() {
  const profiles = await getProfiles()

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to profiles
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">PRS Dataset Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate polygenic risk score datasets for selected profiles and SNPs.
          </p>
        </div>
      </div>

      <PrsReportBuilder profiles={profiles} />
    </main>
  )
}
