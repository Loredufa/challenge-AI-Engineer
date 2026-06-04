export type EventType =
  | 'USER_CREATED'
  | 'OTP_REQUESTED'
  | 'OTP_VERIFIED'
  | 'USER_AUTHENTICATED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_PARSED'
  | 'DOCUMENT_CHUNKED'
  | 'EMBEDDING_GENERATED'
  | 'QUESTION_RECEIVED'
  | 'RAG_SEARCH_EXECUTED'
  | 'PROMPT_CREATED'
  | 'MODEL_INVOKED'
  | 'OUTPUT_VALIDATED'
  | 'RESPONSE_RETURNED'
  | 'FEEDBACK_SUBMITTED'

export interface AuditEvent {
  eventId: string
  eventName: EventType
  correlationId: string
  requestId: string
  userId: string | null
  payload: Record<string, unknown>
  metadata: {
    service: string
    version: string
    environment: string
  }
  timestamp: Date
}
