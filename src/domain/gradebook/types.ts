export interface GradebookSummary {
  score: number
  maximumScore: number
  percentage: number
  minimumPercentage: number
  hasResult: boolean
  thresholdMet: boolean | null
}

export interface GradebookCertificate {
  id: number
  title: string
  issuedAt: string | null
  downloadAvailable: boolean
}

export interface GradebookOverview {
  summary: GradebookSummary
  certificates: GradebookCertificate[]
}
