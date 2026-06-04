import { Pool } from 'pg'
import { IEmbeddingRepository, SimilarChunk } from '@domain/repositories/embedding.repository'
import { DocumentChunk } from '@domain/entities/document-chunk.entity'

export class EmbeddingRepositoryImpl implements IEmbeddingRepository {
  constructor(private readonly pool: Pool) {}

  async bulkCreate(
    embeddings: Array<{
      chunkId: string
      userId: string
      model: string
      embedding: number[]
    }>
  ): Promise<void> {
    if (embeddings.length === 0) return

    const values: unknown[] = []
    const placeholders: string[] = []

    embeddings.forEach((emb, i) => {
      const base = i * 4
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::vector)`
      )
      values.push(emb.chunkId, emb.userId, emb.model, JSON.stringify(emb.embedding))
    })

    await this.pool.query(
      `INSERT INTO embeddings (chunk_id, user_id, model, embedding)
       VALUES ${placeholders.join(', ')}`,
      values
    )
  }

  async similaritySearch(params: {
    queryEmbedding: number[]
    userId: string
    documentIds?: string[]
    topK: number
    threshold: number
  }): Promise<SimilarChunk[]> {
    const { queryEmbedding, userId, documentIds, topK, threshold } = params

    let query = `
      SELECT
        dc.id,
        dc.document_id,
        dc.user_id,
        dc.chunk_index,
        dc.content,
        dc.page_number,
        dc.token_count,
        dc.created_at,
        d.original_name AS document_name,
        1 - (e.embedding <=> $1::vector) AS similarity
      FROM embeddings e
      JOIN document_chunks dc ON dc.id = e.chunk_id
      JOIN documents d ON d.id = dc.document_id
      WHERE e.user_id = $2
        AND d.status = 'READY'
        AND 1 - (e.embedding <=> $1::vector) >= $3
    `

    const values: unknown[] = [JSON.stringify(queryEmbedding), userId, threshold]
    let paramIdx = 4

    if (documentIds && documentIds.length > 0) {
      query += ` AND d.id = ANY($${paramIdx})`
      values.push(documentIds)
      paramIdx++
    }

    query += ` ORDER BY e.embedding <=> $1::vector LIMIT $${paramIdx}`
    values.push(topK)

    const { rows } = await this.pool.query(query, values)

    return rows.map((row) => {
      const chunk: DocumentChunk = {
        id: row.id as string,
        documentId: row.document_id as string,
        userId: row.user_id as string,
        chunkIndex: row.chunk_index as number,
        content: row.content as string,
        pageNumber: row.page_number != null ? Number(row.page_number) : null,
        tokenCount: row.token_count != null ? Number(row.token_count) : null,
        createdAt: row.created_at as Date,
      }
      return {
        chunk,
        similarity: parseFloat(row.similarity),
        documentName: row.document_name as string,
      }
    })
  }
}
