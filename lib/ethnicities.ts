export const ETHNICITIES = [
  "East Asian",
  "African American",
  "Latino (e.g. Mexican, Peruvian, Colombian)",
  "White or European",
  "Native American",
  "Other",
  "Sub-Saharan African",
  "Ashkenazi Jewish",
  "Middle Eastern (eg. Arab, Turkish, Persian, or Non-Ashkenazi Jewish)",
  "Central Asian (e.g. Kazakh, Kyrgyz, Afghan)",
  "South Asian (e.g. Indian, Pakistani, Bangladeshi, Nepali)",
  "Southeast Asian (e.g. Indonesian, Thai, Khmer)",
  "Filipino, Polynesian (including Hawaiian), or Malagasy",
  "Melanesian (e.g. Indigenous Australian, Papuan, Fijian)",
] as const

export type Ethnicity = typeof ETHNICITIES[number]