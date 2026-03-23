import type { SNPSummary, SNPFrequencyTable } from "@/actions/gene"

// Ethnicity → gnomad key mapping
const ETHNICITY_MAP: Record<string, keyof SNPFrequencyTable> = {
  "East Asian": "gnomad_eas",
  "African American": "gnomad_afr",
  "Latino (e.g. Mexican, Peruvian, Colombian)": "gnomad_amr",
  "White or European": "gnomad_nfe",
  "Native American": "gnomad_amr",
  "Other": "gnomad_oth",
  "Sub-Saharan African": "gnomad_afr",
  "Ashkenazi Jewish": "gnomad_asj",
  "Middle Eastern (eg. Arab, Turkish, Persian, or Non-Ashkenazi Jewish)": "gnomad_eas",
  "Central Asian (e.g. Kazakh, Kyrgyz, Afghan)": "gnomad_eas",
  "South Asian (e.g. Indian, Pakistani, Bangladeshi, Nepali)": "gnomad_eas",
  "Southeast Asian (e.g. Indonesian, Thai, Khmer)": "gnomad_eas",
  "Filipino, Polynesian (including Hawaiian), or Malagasy": "gnomad_eas",
  "Melanesian (e.g. Indigenous Australian, Papuan, Fijian": "gnomad_eas",
}

export function getEthnicityKey(ethnicity: string | null | undefined): keyof SNPFrequencyTable {
  if (!ethnicity) return "gnomad_nfe"
  return ETHNICITY_MAP[ethnicity] ?? "gnomad_nfe"
}

/**
 * Compute personalized frequency for a profile's genotype pair.
 * Returns a value 0–1, or null if insufficient data.
 */
export function computePersonalizedFrequency(
  snp: SNPSummary,
  genotypes: string[],
  ethnicityKey: keyof SNPFrequencyTable
): number | null {
  if (!genotypes || genotypes.length === 0) return null

  // Build ref allele from variant_id e.g. "17_43092418_T_C" → "T"
  const refAllele = snp.variant_ids[0]?.split("_")[2] ?? null

  // Build a map: allele → frequency for this ethnicity
  const freqMap: Record<string, number> = {}
  snp.alts.forEach((alt, i) => {
    const freq = snp.frequency_tables[i]?.[ethnicityKey]
    if (freq !== undefined) freqMap[alt] = freq
  })
  if (refAllele) {
    const altFreqSum = Object.values(freqMap).reduce((s, v) => s + v, 0)
    freqMap[refAllele] = 1 - altFreqSum
  }

  const [g1, g2] = genotypes
  const f1 = freqMap[g1]
  const f2 = g2 !== undefined ? freqMap[g2] : undefined

  if (f1 === undefined) return null
  if (f2 === undefined) return f1

  return f1 * f2
}