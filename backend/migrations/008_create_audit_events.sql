CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE,
  event_name VARCHAR(50) NOT NULL,
  correlation_id UUID NOT NULL,
  request_id UUID NOT NULL,
  user_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_event_name ON audit_events(event_name, timestamp);
CREATE INDEX idx_audit_user ON audit_events(user_id, timestamp);
CREATE INDEX idx_audit_correlation ON audit_events(correlation_id);
CREATE INDEX idx_audit_timestamp ON audit_events(timestamp);
