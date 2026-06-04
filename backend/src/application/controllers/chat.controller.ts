import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { RAGService } from '@domain/services/rag.service'

const chatQuestionSchema = z.object({
  question: z.string().min(1).max(2000),
  document_ids: z.array(z.string().uuid()).optional(),
})

export class ChatController {
  constructor(private readonly ragService: RAGService) {}

  history = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = res.locals as { userId: string }
      const items = await this.ragService.getHistory(userId)
      res.json({ history: items })
    } catch (err) {
      next(err)
    }
  }

  /** POST /api/v1/chat/question — Runs the full RAG pipeline: embeds the question, retrieves relevant chunks via pgvector, builds a versioned prompt, calls the LLM, and returns the answer with sources and confidence score. Returns 422 if the input guard rejects the question. */
  ask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, correlationId, requestId } = res.locals as {
        userId: string
        correlationId: string
        requestId: string
      }
      const { question, document_ids } = chatQuestionSchema.parse(req.body)

      const answer = await this.ragService.ask({
        question,
        userId,
        documentIds: document_ids,
        correlationId,
        requestId,
      })

      const statusCode = answer.rejectionReason ? 422 : 200
      res.status(statusCode).json({
        interaction_id: answer.interactionId,
        answer: answer.answer,
        sources: answer.sources,
        confidence_score: answer.confidenceScore,
        warnings: answer.warnings,
        model_used: answer.modelUsed,
        prompt_version: answer.promptVersion,
        latency_ms: answer.latencyMs,
        rejection_reason: answer.rejectionReason,
        ...(answer.rejectionReason
          ? { message: 'Your question was rejected by the security policy.' }
          : {}),
      })
    } catch (err) {
      next(err)
    }
  }
}
