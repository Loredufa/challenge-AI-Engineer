import { Pool } from 'pg'
import { IFeedbackRepository } from '@domain/repositories/feedback.repository'
import { Feedback, FeedbackRating } from '@domain/entities/feedback.entity'

function rowToFeedback(row: Record<string, unknown>): Feedback {
  return {
    id: row.id as string,
    interactionId: row.interaction_id as string,
    userId: row.user_id as string,
    rating: row.rating as FeedbackRating,
    comment: row.comment as string | null,
    createdAt: row.created_at as Date,
  }
}

export class FeedbackRepositoryImpl implements IFeedbackRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
    const { rows } = await this.pool.query(
      `INSERT INTO feedback (interaction_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.interactionId, data.userId, data.rating, data.comment ?? null]
    )
    return rowToFeedback(rows[0])
  }

  async findByInteraction(interactionId: string): Promise<Feedback | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM feedback WHERE interaction_id = $1 LIMIT 1',
      [interactionId]
    )
    return rows[0] ? rowToFeedback(rows[0]) : null
  }

  async findByUser(userId: string): Promise<Feedback[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    return rows.map(rowToFeedback)
  }
}
