CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES ai_interactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating VARCHAR(10) NOT NULL CHECK (rating IN ('APPROVED', 'REJECTED', 'NEUTRAL')),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(interaction_id)
);
CREATE INDEX idx_feedback_interaction ON feedback(interaction_id);
CREATE INDEX idx_feedback_user ON feedback(user_id, created_at DESC);
CREATE INDEX idx_feedback_rating ON feedback(rating);
