export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'QUARANTINED'

export interface Document {
  id: string
  userId: string
  filename: string
  originalName: string
  s3Key: string
  sizeBytes: number
  status: DocumentStatus
  totalPages: number | null
  totalChunks: number | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}
