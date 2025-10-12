-- Add system categories for income and expense types
INSERT INTO categories (name, icon, color, type, is_system) VALUES
-- Expense categories
('Alimentari', 'lucide:ShoppingCart', 'gradient-pink', 'expense', true),
('Trasporti', 'lucide:Car', 'gradient-blue', 'expense', true),
('Intrattenimento', 'lucide:Gamepad2', 'gradient-purple', 'expense', true),
('Salute', 'lucide:Heart', 'gradient-red', 'expense', true),
('Casa', 'lucide:Home', 'gradient-orange', 'expense', true),
('Vestiti', 'lucide:Shirt', 'gradient-green', 'expense', true),
('Educazione', 'lucide:BookOpen', 'gradient-indigo', 'expense', true),
('Viaggi', 'lucide:Plane', 'gradient-cyan', 'expense', true),
('Utenze', 'lucide:Zap', 'gradient-yellow', 'expense', true),
('Altro', 'lucide:MoreHorizontal', 'gradient-gray', 'expense', true),

-- Income categories
('Stipendio', 'lucide:Banknote', 'gradient-green', 'income', true),
('Freelance', 'lucide:Code', 'gradient-blue', 'income', true),
('Investimenti', 'lucide:TrendingUp', 'gradient-purple', 'income', true),
('Vendite', 'lucide:ShoppingBag', 'gradient-orange', 'income', true),
('Regalo', 'lucide:Gift', 'gradient-pink', 'income', true),
('Rimborso', 'lucide:RefreshCw', 'gradient-cyan', 'income', true),
('Affitto', 'lucide:Home', 'gradient-indigo', 'income', true),
('Dividendi', 'lucide:PieChart', 'gradient-red', 'income', true),
('Altro', 'lucide:MoreHorizontal', 'gradient-gray', 'income', true);

