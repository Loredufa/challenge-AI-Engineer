import { Feedback } from '@domain/entities/feedback.entity'

export interface IFeedbackRepository {
  create(data: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback>
  findByInteraction(interactionId: string): Promise<Feedback | null>
  findByUser(userId: string): Promise<Feedback[]>
}
