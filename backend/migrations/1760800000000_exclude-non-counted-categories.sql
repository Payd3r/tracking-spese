-- Mark categories that move money without representing income/expense for analytics.
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS exclude_from_totals BOOLEAN NOT NULL DEFAULT false;

-- Existing transfer categories should never affect analytical totals.
UPDATE categories
SET exclude_from_totals = true
WHERE name = 'Trasferimento';

-- System category for loan advances. The actual loss, if any, is recorded when the loan is closed.
INSERT INTO categories (user_id, name, icon, color, type, is_system, exclude_from_totals)
SELECT NULL, 'Prestito', 'lucide:HandCoins', 'gradient-blue', 'expense', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM categories
  WHERE user_id IS NULL AND is_system = true AND type = 'expense' AND name = 'Prestito'
);

UPDATE categories
SET icon = 'lucide:HandCoins',
    color = 'gradient-blue',
    exclude_from_totals = true
WHERE user_id IS NULL AND is_system = true AND type = 'expense' AND name = 'Prestito';

-- System category for loan repayments.
INSERT INTO categories (user_id, name, icon, color, type, is_system, exclude_from_totals)
SELECT NULL, 'Restituzione prestito', 'lucide:Undo2', 'gradient-green', 'income', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM categories
  WHERE user_id IS NULL AND is_system = true AND type = 'income' AND name = 'Restituzione prestito'
);

UPDATE categories
SET icon = 'lucide:Undo2',
    color = 'gradient-green',
    exclude_from_totals = true
WHERE user_id IS NULL AND is_system = true AND type = 'income' AND name = 'Restituzione prestito';

-- Reclassify already-generated loan advance transactions to the excluded loan category.
WITH loan_expense_category AS (
  SELECT id
  FROM categories
  WHERE user_id IS NULL AND is_system = true AND type = 'expense' AND name = 'Prestito'
  LIMIT 1
)
UPDATE transactions t
SET category_id = (SELECT id FROM loan_expense_category)
FROM loans l
WHERE t.user_id = l.user_id
  AND t.account_id = l.from_account_id
  AND t.category_id = l.category_id
  AND t.type = 'expense'
  AND t.transaction_date = l.loan_date
  AND (
    t.title = l.title
    OR t.title = l.note
    OR t.note = l.note
  )
  AND EXISTS (SELECT 1 FROM loan_expense_category);

-- Reclassify already-generated loan repayment transactions to the excluded repayment category.
WITH loan_repayment_category AS (
  SELECT id
  FROM categories
  WHERE user_id IS NULL AND is_system = true AND type = 'income' AND name = 'Restituzione prestito'
  LIMIT 1
)
UPDATE transactions t
SET category_id = (SELECT id FROM loan_repayment_category)
FROM loan_repayments lr
JOIN loans l ON l.id = lr.loan_id
WHERE t.user_id = l.user_id
  AND t.account_id = lr.to_account_id
  AND t.type = 'income'
  AND t.transaction_date = lr.repayment_date
  AND (
    t.title = lr.description
    OR t.title = 'Restituzione prestito'
    OR t.note = lr.description
    OR t.note = 'Restituzione prestito'
  )
  AND EXISTS (SELECT 1 FROM loan_repayment_category);
