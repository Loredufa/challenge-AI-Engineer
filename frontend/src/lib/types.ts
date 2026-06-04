export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface Document {
  id: string
  originalName: string
  filename: string
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'QUARANTINED'
  totalPages: number | null
  totalChunks: number | null
  sizeBytes: number
  createdAt: string
}

export interface ChatSource {
  documentId: string
  documentName: string
  chunkId: string
  pageNumber: number | null
  excerpt: string
  similarityScore: number
}

export interface ChatResponse {
  interaction_id: string
  answer: string | null
  sources: ChatSource[]
  confidence_score: number
  warnings: string[]
  model_used: string | null
  prompt_version: number | null
  latency_ms: number
  rejection_reason: string | null
  message?: string
}

export interface HistoryEntry {
  interaction_id: string
  question: string
  answer: string | null
  confidence_score: number
  warnings: string[]
  model_used: string | null
  latency_ms: number | null
  rejection_reason: string | null
  created_at: string
}

export interface Feedback {
  feedback_id: string
  interaction_id: string
  rating: 'APPROVED' | 'REJECTED' | 'NEUTRAL'
}
