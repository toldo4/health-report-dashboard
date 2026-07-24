/**
 * Per-patient overrides for pdf_config.company_profile.
 * Keys are SelfDecode profile IDs. Any field set here will override the
 * DEFAULT_PDF_CONFIG in actions/reports.ts for that patient.
 *
 * Example:
 *   "abc123": { professional_name: "Dr. Jane Smith", email: "jane@nutrigenix.ae" }
 */
export const PATIENT_PDF_CONFIGS: Record<
  string,
  Partial<{
    company_name:      string
    professional_name: string
    email:             string
    phone:             string
    website:           string
    address:           string
    logo:              string
  }>
> = {
  // "profile-id": { professional_name: "Dr. Other Doctor" },
}
