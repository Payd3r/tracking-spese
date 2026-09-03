-- Expand icon column to support Lucide icon names (e.g., "lucide:Wallet")
ALTER TABLE accounts ALTER COLUMN icon TYPE VARCHAR(50);
ALTER TABLE categories ALTER COLUMN icon TYPE VARCHAR(50);

