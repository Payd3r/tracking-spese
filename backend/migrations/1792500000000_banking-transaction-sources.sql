-- One expense can be reported by PayPal and the account funding its card.
-- Keep both references and original snapshots while counting one transaction.
CREATE TABLE banking_transaction_sources (
    banking_account_uid UUID NOT NULL,
    banking_entry_reference TEXT NOT NULL,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (banking_account_uid, banking_entry_reference)
);
CREATE INDEX idx_banking_transaction_sources_transaction
    ON banking_transaction_sources(transaction_id);

INSERT INTO banking_transaction_sources
    (banking_account_uid, banking_entry_reference, transaction_id, account_name, snapshot)
SELECT t.banking_account_uid, t.banking_entry_reference, t.id, a.name, to_jsonb(t)
FROM transactions t JOIN accounts a ON a.id = t.account_id
WHERE t.banking_account_uid IS NOT NULL AND t.banking_entry_reference IS NOT NULL;
