CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  correlation_id UUID NOT NULL,
  request_id UUID NOT NULL,
  question TEXT NOT NULL,
  prompt_version_id UUID REFERENCES prompt_versions(id),
  model VARCHAR(100),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost_usd DECIMAL(10, 6),
  latency_ms INTEGER,
  response TEXT,
  confidence_score DECIMAL(4, 3),
  top_similarity_score DECIMAL(4, 3),
  retrieved_chunk_ids UUID[] DEFAULT '{}',
  input_guard_result VARCHAR(10),
  output_guard_result VARCHAR(10),
  rejection_reason VARCHAR(50),
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_interactions_user ON ai_interactions(user_id, created_at DESC);
CREATE INDEX idx_interactions_correlation ON ai_interactions(correlation_id);
CREATE INDEX idx_interactions_prompt ON ai_interactions(prompt_version_id);
