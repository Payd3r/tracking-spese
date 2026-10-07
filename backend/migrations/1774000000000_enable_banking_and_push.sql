-- Enable Banking sessions and account links
CREATE TABLE IF NOT EXISTS banking_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL UNIQUE,
    aspsp_name VARCHAR(100) NOT NULL,
    aspsp_country VARCHAR(2) NOT NULL,
    valid_until TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    last_sync_at TIMESTAMPTZ,
    last_sync_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_banking_sessions_user_id ON banking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_banking_sessions_status ON banking_sessions(status);

CREATE TABLE IF NOT EXISTS banking_account_links (
    id SERIAL PRIMARY KEY,
    banking_session_id INTEGER NOT NULL REFERENCES banking_sessions(id) ON DELETE CASCADE,
    account_uid UUID NOT NULL UNIQUE,
    identification_hash TEXT,
    iban VARCHAR(64),
    currency VARCHAR(3),
    account_name TEXT,
    local_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_banking_account_links_session ON banking_account_links(banking_session_id);
CREATE INDEX IF NOT EXISTS idx_banking_account_links_local ON banking_account_links(local_account_id);

CREATE TABLE IF NOT EXISTS banking_auth_states (
    state UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    aspsp_name VARCHAR(100) NOT NULL,
    aspsp_country VARCHAR(2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_banking_auth_states_expires ON banking_auth_states(expires_at);

-- Push subscriptions for Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Transaction banking metadata
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'manual';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS banking_entry_reference TEXT;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS banking_account_uid UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_banking_entry
  ON transactions (banking_account_uid, banking_entry_reference)
  WHERE banking_account_uid IS NOT NULL AND banking_entry_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);

CREATE TRIGGER update_banking_sessions_updated_at
  BEFORE UPDATE ON banking_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banking_account_links_updated_at
  BEFORE UPDATE ON banking_account_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
