export type InteractionStatus = 'COMPLETED' | 'REJECTED' | 'FAILED'
export type GuardResult = 'ALLOWED' | 'REJECTED'

export interface AIInteraction {
  id: string
  userId: string
  correlationId: string
  requestId: string
  question: string
  promptVersionId: string | null
  model: string | null
  promptTokens: number | null
  completionTokens: number | null
  costUsd: number | null
  latencyMs: number | null
  response: string | null
  confidenceScore: number | null
  topSimilarityScore: number | null
  retrievedChunkIds: string[]
  inputGuardResult: GuardResult | null
  outputGuardResult: GuardResult | null
  rejectionReason: string | null
  status: InteractionStatus
  createdAt: Date
}
