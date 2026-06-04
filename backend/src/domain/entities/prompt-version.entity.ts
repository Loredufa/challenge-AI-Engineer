export interface PromptVersion {
  id: string
  name: string
  versionNumber: number
  content: string
  contentHash: string
  isActive: boolean
  createdAt: Date
  deprecatedAt: Date | null
}
