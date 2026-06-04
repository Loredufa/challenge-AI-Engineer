export interface DocumentChunk {
  id: string
  documentId: string
  userId: string
  chunkIndex: number
  content: string
  pageNumber: number | null
  tokenCount: number | null
  createdAt: Date
}
