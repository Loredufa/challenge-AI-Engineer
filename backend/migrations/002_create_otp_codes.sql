CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  failed_attempts INTEGER DEFAULT 0,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_otp_email_active ON otp_codes(email, used_at, expires_at);
