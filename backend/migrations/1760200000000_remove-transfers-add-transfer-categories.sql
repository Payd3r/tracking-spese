-- Remove transfers table and add transfer categories
-- This migration converts transfers from a separate entity to regular transactions

-- Drop the transfers table
DROP TABLE IF EXISTS transfers CASCADE;

-- Insert transfer categories for income and expense
-- These are system categories that cannot be deleted by users

-- Transfer category for expenses (when money leaves an account)
INSERT INTO categories (user_id, name, icon, color, type, is_system)
VALUES (NULL, 'Trasferimento', 'lucide:ArrowLeftRight', '#ef4444', 'expense', true);

-- Transfer category for income (when money enters an account)
INSERT INTO categories (user_id, name, icon, color, type, is_system)
VALUES (NULL, 'Trasferimento', 'lucide:ArrowLeftRight', '#22c55e', 'income', true);


