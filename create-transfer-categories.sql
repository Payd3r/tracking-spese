-- Script SQL per creare le categorie di trasferimento
-- Queste categorie sono necessarie per gestire i trasferimenti tra conti

-- Verifica ed inserisce la categoria di trasferimento per le spese (denaro che esce)
-- Questa categoria viene usata quando si crea una transazione di tipo expense sul conto di origine
INSERT INTO categories (user_id, name, icon, color, type, is_system)
SELECT NULL, 'Trasferimento', 'lucide:ArrowLeftRight', '#ef4444', 'expense', true
WHERE NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE name = 'Trasferimento' 
    AND type = 'expense' 
    AND is_system = true
    AND user_id IS NULL
);

-- Verifica ed inserisce la categoria di trasferimento per gli incassi (denaro che entra)
-- Questa categoria viene usata quando si crea una transazione di tipo income sul conto di destinazione
INSERT INTO categories (user_id, name, icon, color, type, is_system)
SELECT NULL, 'Trasferimento', 'lucide:ArrowLeftRight', '#22c55e', 'income', true
WHERE NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE name = 'Trasferimento' 
    AND type = 'income' 
    AND is_system = true
    AND user_id IS NULL
);

-- Verifica finale: mostra le categorie create
SELECT id, name, type, color, icon, is_system, user_id 
FROM categories 
WHERE name = 'Trasferimento' AND is_system = true
ORDER BY type;
