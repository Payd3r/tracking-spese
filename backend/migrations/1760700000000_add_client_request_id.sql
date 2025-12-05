-- Idempotency support for offline sync operations

-- Add client_request_id columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

ALTER TABLE loan_repayments
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

-- Unique indexes to enforce idempotency per user/loan scope
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_client_request
  ON transactions (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_loans_client_request
  ON loans (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_repayments_client_request
  ON loan_repayments (loan_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
