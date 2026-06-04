export type FeedbackRating = 'APPROVED' | 'REJECTED' | 'NEUTRAL'

export interface Feedback {
  id: string
  interactionId: string
  userId: string
  rating: FeedbackRating
  comment: string | null
  createdAt: Date
}
