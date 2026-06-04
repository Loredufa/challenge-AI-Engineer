import { Pool } from 'pg'
import { IAIInteractionRepository } from '@domain/repositories/ai-interaction.repository'
import { AIInteraction, GuardResult, InteractionStatus } from '@domain/entities/ai-interaction.entity'

function rowToAIInteraction(row: Record<string, unknown>): AIInteraction {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    correlationId: row.correlation_id as string,
    requestId: row.request_id as string,
    question: row.question as string,
    promptVersionId: row.prompt_version_id as string | null,
    model: row.model as string | null,
    promptTokens: row.prompt_tokens != null ? Number(row.prompt_tokens) : null,
    completionTokens: row.completion_tokens != null ? Number(row.completion_tokens) : null,
    costUsd: row.cost_usd != null ? parseFloat(String(row.cost_usd)) : null,
    latencyMs: row.latency_ms != null ? Number(row.latency_ms) : null,
    response: row.response as string | null,
    confidenceScore: row.confidence_score != null ? parseFloat(String(row.confidence_score)) : null,
    topSimilarityScore: row.top_similarity_score != null ? parseFloat(String(row.top_similarity_score)) : null,
    retrievedChunkIds: (row.retrieved_chunk_ids as string[]) ?? [],
    inputGuardResult: row.input_guard_result as GuardResult | null,
    outputGuardResult: row.output_guard_result as GuardResult | null,
    rejectionReason: row.rejection_reason as string | null,
    status: row.status as InteractionStatus,
    createdAt: row.created_at as Date,
  }
}

export class AIInteractionRepositoryImpl implements IAIInteractionRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: Omit<AIInteraction, 'id' | 'createdAt'>): Promise<AIInteraction> {
    const { rows } = await this.pool.query(
      `INSERT INTO ai_interactions (
        user_id, correlation_id, request_id, question,
        prompt_version_id, model, prompt_tokens, completion_tokens,
        cost_usd, latency_ms, response, confidence_score,
        top_similarity_score, retrieved_chunk_ids, input_guard_result,
        output_guard_result, rejection_reason, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18
      ) RETURNING *`,
      [
        data.userId,
        data.correlationId,
        data.requestId,
        data.question,
        data.promptVersionId ?? null,
        data.model ?? null,
        data.promptTokens ?? null,
        data.completionTokens ?? null,
        data.costUsd ?? null,
        data.latencyMs ?? null,
        data.response ?? null,
        data.confidenceScore ?? null,
        data.topSimilarityScore ?? null,
        data.retrievedChunkIds,
        data.inputGuardResult ?? null,
        data.outputGuardResult ?? null,
        data.rejectionReason ?? null,
        data.status,
      ]
    )
    return rowToAIInteraction(rows[0])
  }

  async findById(id: string): Promise<AIInteraction | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM ai_interactions WHERE id = $1 LIMIT 1',
      [id]
    )
    return rows[0] ? rowToAIInteraction(rows[0]) : null
  }

  async findByUser(userId: string, limit = 20): Promise<AIInteraction[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM ai_interactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    )
    return rows.map(rowToAIInteraction)
  }
}
