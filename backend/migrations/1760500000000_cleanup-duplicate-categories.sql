-- Cleanup duplicate categories and ensure system categories are global
-- This migration removes user-specific categories that duplicate system categories

-- First, delete user-specific categories that have the same name as system categories
DELETE FROM categories 
WHERE is_system = false 
AND user_id IS NOT NULL
AND name IN (
  SELECT DISTINCT name 
  FROM categories 
  WHERE is_system = true
);

-- Ensure all system categories have user_id = NULL
UPDATE categories 
SET user_id = NULL 
WHERE is_system = true AND user_id IS NOT NULL;

-- Ensure all non-system categories have a valid user_id
UPDATE categories 
SET is_system = false 
WHERE is_system = true AND user_id IS NOT NULL;

-- Add unique constraint to prevent duplicate system categories
-- This ensures we don't have multiple system categories with the same name
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_system_unique 
ON categories (name, type) 
WHERE is_system = true;
