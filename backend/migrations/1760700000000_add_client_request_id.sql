-- Idempotency support for offline sync operations

-- Add client_request_id columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

ALTER TABLE loan_repayments
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

-- Unique constraints (no predicate) so ON CONFLICT can target them
ALTER TABLE transactions
  ADD CONSTRAINT IF NOT EXISTS uniq_transactions_client_request UNIQUE (user_id, client_request_id);

ALTER TABLE loans
  ADD CONSTRAINT IF NOT EXISTS uniq_loans_client_request UNIQUE (user_id, client_request_id);

ALTER TABLE loan_repayments
  ADD CONSTRAINT IF NOT EXISTS uniq_loan_repayments_client_request UNIQUE (loan_id, client_request_id);
