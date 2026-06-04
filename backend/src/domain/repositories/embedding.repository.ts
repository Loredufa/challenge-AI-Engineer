import { DocumentChunk } from '@domain/entities/document-chunk.entity'

export interface SimilarChunk {
  chunk: DocumentChunk
  similarity: number
  documentName: string
}

export interface IEmbeddingRepository {
  bulkCreate(embeddings: Array<{
    chunkId: string
    userId: string
    model: string
    embedding: number[]
  }>): Promise<void>

  similaritySearch(params: {
    queryEmbedding: number[]
    userId: string
    documentIds?: string[]
    topK: number
    threshold: number
  }): Promise<SimilarChunk[]>
}
