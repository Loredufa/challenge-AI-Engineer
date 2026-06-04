import { Pool } from 'pg'
import { IChunkRepository } from '@domain/repositories/chunk.repository'
import { DocumentChunk } from '@domain/entities/document-chunk.entity'

function rowToChunk(row: Record<string, unknown>): DocumentChunk {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    userId: row.user_id as string,
    chunkIndex: row.chunk_index as number,
    content: row.content as string,
    pageNumber: row.page_number != null ? Number(row.page_number) : null,
    tokenCount: row.token_count != null ? Number(row.token_count) : null,
    createdAt: row.created_at as Date,
  }
}

export class ChunkRepositoryImpl implements IChunkRepository {
  constructor(private readonly pool: Pool) {}

  async bulkCreate(
    chunks: Omit<DocumentChunk, 'id' | 'createdAt'>[]
  ): Promise<DocumentChunk[]> {
    if (chunks.length === 0) return []

    const values: unknown[] = []
    const placeholders: string[] = []

    chunks.forEach((chunk, i) => {
      const base = i * 6
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
      )
      values.push(
        chunk.documentId,
        chunk.userId,
        chunk.chunkIndex,
        chunk.content,
        chunk.pageNumber ?? null,
        chunk.tokenCount ?? null
      )
    })

    const { rows } = await this.pool.query(
      `INSERT INTO document_chunks (document_id, user_id, chunk_index, content, page_number, token_count)
       VALUES ${placeholders.join(', ')}
       RETURNING *`,
      values
    )
    return rows.map(rowToChunk)
  }

  async findByDocument(documentId: string): Promise<DocumentChunk[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index ASC',
      [documentId]
    )
    return rows.map(rowToChunk)
  }

  async findById(id: string): Promise<DocumentChunk | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM document_chunks WHERE id = $1 LIMIT 1',
      [id]
    )
    return rows[0] ? rowToChunk(rows[0]) : null
  }
}
