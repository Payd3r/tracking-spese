-- Create authenticators table for Passkey credentials
CREATE TABLE IF NOT EXISTS authenticators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key BYTEA NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports TEXT[],
    device_type VARCHAR(32),
    backed_up BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);
CREATE INDEX IF NOT EXISTS idx_authenticators_credential_id ON authenticators(credential_id);

-- Create passkey_challenges table
CREATE TABLE IF NOT EXISTS passkey_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Ensure single user 'andreamauri2013' exists in users table
INSERT INTO users (email, password_hash, name, default_currency)
SELECT 'andreamauri2013', 'passkey_user', 'Andrea Mauri', 'EUR'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE LOWER(email) = 'andreamauri2013' OR LOWER(email) = 'andreamauri2013@gmail.com'
);

-- Ensure all existing user-linked records point to the single user
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM users WHERE LOWER(email) IN ('andreamauri2013', 'andreamauri2013@gmail.com') ORDER BY created_at ASC LIMIT 1;
  
  IF target_user_id IS NOT NULL THEN
    UPDATE users SET email = 'andreamauri2013' WHERE id = target_user_id;
    UPDATE accounts SET user_id = target_user_id WHERE user_id != target_user_id;
    UPDATE categories SET user_id = target_user_id WHERE user_id IS NOT NULL AND user_id != target_user_id;
    UPDATE transactions SET user_id = target_user_id WHERE user_id != target_user_id;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfers') THEN
      UPDATE transfers SET user_id = target_user_id WHERE user_id != target_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loans') THEN
      UPDATE loans SET user_id = target_user_id WHERE user_id != target_user_id;
    END IF;
  END IF;
END $$;
