import { AIInteraction } from '@domain/entities/ai-interaction.entity'

export interface IAIInteractionRepository {
  create(data: Omit<AIInteraction, 'id' | 'createdAt'>): Promise<AIInteraction>
  findById(id: string): Promise<AIInteraction | null>
  findByUser(userId: string, limit?: number): Promise<AIInteraction[]>
}
