import pool from '../config/database.js';
import { ValidationError } from '../middleware/errorHandler.js';

export const getCategories = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // 'income' or 'expense'
    
    let query = `
      SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        c.type,
        c.is_system,
        c.exclude_from_totals,
        c.created_at,
        COALESCE(category_usage.usage_count, 0) as usage_count
      FROM categories c
      LEFT JOIN (
        SELECT category_id, COUNT(*) as usage_count
        FROM transactions
        WHERE user_id = $1
        GROUP BY category_id
      ) category_usage ON category_usage.category_id = c.id
      WHERE (c.user_id = $1 OR c.is_system = true)
    `;
    
    const params = [userId];
    
    if (type) {
      query += ' AND c.type = $2';
      params.push(type);
    }
    
    query += ' ORDER BY usage_count DESC, c.is_system DESC, c.name ASC';
    
    const result = await pool.query(query, params);
    
    const categories = result.rows.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      isSystem: cat.is_system,
      excludeFromTotals: cat.exclude_from_totals,
      usageCount: parseInt(cat.usage_count, 10) || 0,
      createdAt: cat.created_at
    }));
    
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, icon, color, type } = req.body;
    
    if (!name || !type) {
      throw new ValidationError('Nome e tipo sono obbligatori');
    }
    
    if (!['income', 'expense'].includes(type)) {
      throw new ValidationError('Tipo deve essere "income" o "expense"');
    }
    
    const result = await pool.query(
      `INSERT INTO categories (user_id, name, icon, color, type, is_system)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, name, icon, color, type, is_system, exclude_from_totals, created_at`,
      [userId, name, icon || null, color || null, type]
    );
    
    const category = result.rows[0];
    
    res.status(201).json({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      isSystem: category.is_system,
      excludeFromTotals: category.exclude_from_totals,
      usageCount: 0,
      createdAt: category.created_at
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const categoryId = parseInt(req.params.id);
    const { name, icon, color } = req.body;
    
    // Check if category exists and belongs to user (cannot update system categories)
    const checkResult = await pool.query(
      'SELECT id, is_system FROM categories WHERE id = $1 AND user_id = $2',
      [categoryId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      throw new ValidationError('Categoria non trovata o non modificabile');
    }
    
    if (checkResult.rows[0].is_system) {
      throw new ValidationError('Non puoi modificare categorie di sistema');
    }
    
    const result = await pool.query(
      `UPDATE categories 
       SET name = COALESCE($1, name),
           icon = COALESCE($2, icon),
           color = COALESCE($3, color)
       WHERE id = $4 AND user_id = $5
       RETURNING id, name, icon, color, type, is_system, exclude_from_totals, created_at`,
      [name || null, icon || null, color || null, categoryId, userId]
    );
    
    const category = result.rows[0];
    
    res.json({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      isSystem: category.is_system,
      excludeFromTotals: category.exclude_from_totals,
      usageCount: 0,
      createdAt: category.created_at
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const categoryId = parseInt(req.params.id);
    
    await client.query('BEGIN');
    
    // Check if category exists and belongs to user (cannot delete system categories)
    const checkResult = await client.query(
      'SELECT id, is_system FROM categories WHERE id = $1 AND user_id = $2',
      [categoryId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      throw new ValidationError('Categoria non trovata o non eliminabile');
    }
    
    if (checkResult.rows[0].is_system) {
      throw new ValidationError('Non puoi eliminare categorie di sistema');
    }
    
    // Check if there are transactions using this category
    const transactionsResult = await client.query(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = $1',
      [categoryId]
    );
    
    if (parseInt(transactionsResult.rows[0].count) > 0) {
      throw new ValidationError('Impossibile eliminare una categoria con transazioni associate');
    }
    
    // Delete category
    await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'Categoria eliminata con successo' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};


