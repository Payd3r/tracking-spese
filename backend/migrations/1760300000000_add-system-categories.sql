-- Add system categories for income and expense types
INSERT INTO categories (name, icon, color, type, is_system) VALUES
-- Expense categories
('Alimentari', 'lucide:ShoppingCart', 'gradient-pink', 'expense', true),
('Trasporti', 'lucide:Car', 'gradient-blue', 'expense', true),
('Salute', 'lucide:Heart', 'gradient-red', 'expense', true),
('Casa', 'lucide:Home', 'gradient-orange', 'expense', true),
('Vestiti', 'lucide:Shirt', 'gradient-green', 'expense', true),
('Viaggi', 'lucide:Plane', 'gradient-cyan', 'expense', true),
('Altro', 'lucide:MoreHorizontal', 'gradient-gray', 'expense', true),

-- Income categories
('Stipendio', 'lucide:Banknote', 'gradient-green', 'income', true),
('Investimenti', 'lucide:TrendingUp', 'gradient-purple', 'income', true),
('Regalo', 'lucide:Gift', 'gradient-pink', 'income', true),
('Altro', 'lucide:MoreHorizontal', 'gradient-gray', 'income', true);

