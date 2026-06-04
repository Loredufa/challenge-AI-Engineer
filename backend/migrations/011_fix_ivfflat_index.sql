-- ivfflat with lists=100 fails on small datasets (< 100 rows).
-- Drop and recreate with lists=1 so all vectors are in one list
-- and probes=1 (default) always finds them.
DROP INDEX IF EXISTS idx_embeddings_vector;

CREATE INDEX idx_embeddings_vector
  ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 1);
