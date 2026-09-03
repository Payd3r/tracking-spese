-- Fix transfer category icons
-- Update existing transfer categories to use correct Lucide icon name

-- Update transfer category for expenses
UPDATE categories 
SET icon = 'lucide:ArrowLeftRight' 
WHERE name = 'Trasferimento' AND type = 'expense' AND is_system = true;

-- Update transfer category for income  
UPDATE categories 
SET icon = 'lucide:ArrowLeftRight' 
WHERE name = 'Trasferimento' AND type = 'income' AND is_system = true;
