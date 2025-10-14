import pool from '../config/database.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { convertCurrency } from '../services/currencyService.js';

export const getTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      accountId, 
      categoryId, 
      type, 
      startDate, 
      endDate, 
      limit = 50,
      offset = 0 
    } = req.query;
    
    // Build WHERE clause for both queries
    let whereClause = 'WHERE t.user_id = $1';
    const params = [userId];
    let paramIndex = 2;
    
    if (accountId) {
      whereClause += ` AND t.account_id = $${paramIndex}`;
      params.push(parseInt(accountId));
      paramIndex++;
    }
    
    if (categoryId) {
      whereClause += ` AND t.category_id = $${paramIndex}`;
      params.push(parseInt(categoryId));
      paramIndex++;
    }
    
    if (type) {
      whereClause += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    if (startDate) {
      whereClause += ` AND t.transaction_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereClause += ` AND t.transaction_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    // Count total transactions matching filters
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated transactions
    let query = `
      SELECT 
        t.id, 
        t.account_id,
        t.category_id,
        t.amount,
        t.original_amount,
        t.original_currency,
        t.type,
        t.title,
        t.note,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        a.name as account_name,
        a.currency as account_currency,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    const transactions = result.rows.map(t => ({
      id: t.id,
      accountId: t.account_id,
      accountName: t.account_name,
      accountCurrency: t.account_currency,
      categoryId: t.category_id,
      categoryName: t.category_name,
      categoryIcon: t.category_icon,
      categoryColor: t.category_color,
      amount: parseFloat(t.amount),
      originalAmount: t.original_amount ? parseFloat(t.original_amount) : null,
      originalCurrency: t.original_currency,
      type: t.type,
      title: t.title,
      note: t.note,
      transactionDate: t.transaction_date,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
    
    res.json({ transactions, total });
  } catch (error) {
    next(error);
  }
};

export const getTransaction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);
    
    const result = await pool.query(
      `SELECT 
        t.id, 
        t.account_id,
        t.category_id,
        t.amount,
        t.original_amount,
        t.original_currency,
        t.type,
        t.title,
        t.note,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        a.name as account_name,
        a.currency as account_currency,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = $1 AND t.user_id = $2`,
      [transactionId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new ValidationError('Transazione non trovata');
    }
    
    const t = result.rows[0];
    
    res.json({
      id: t.id,
      accountId: t.account_id,
      accountName: t.account_name,
      accountCurrency: t.account_currency,
      categoryId: t.category_id,
      categoryName: t.category_name,
      categoryIcon: t.category_icon,
      categoryColor: t.category_color,
      amount: parseFloat(t.amount),
      originalAmount: t.original_amount ? parseFloat(t.original_amount) : null,
      originalCurrency: t.original_currency,
      type: t.type,
      title: t.title,
      note: t.note,
      transactionDate: t.transaction_date,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    });
  } catch (error) {
    next(error);
  }
};

export const createTransaction = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const {
      accountId,
      categoryId,
      amount,
      currency, // Currency in which user is entering the amount
      type,
      title,
      note,
      transactionDate
    } = req.body;
    
    // Validation
    if (!accountId || !categoryId || !amount || !type || !title || !transactionDate) {
      throw new ValidationError('Campi obbligatori mancanti');
    }
    
    if (!['income', 'expense'].includes(type)) {
      throw new ValidationError('Tipo deve essere "income" o "expense"');
    }
    
    if (amount <= 0) {
      throw new ValidationError('L\'importo deve essere positivo');
    }
    
    await client.query('BEGIN');
    
    // Get account info
    const accountResult = await client.query(
      'SELECT id, currency FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new ValidationError('Account non trovato');
    }
    
    const account = accountResult.rows[0];
    const accountCurrency = account.currency;
    const inputCurrency = currency || accountCurrency;
    
    let finalAmount = amount;
    let originalAmount = null;
    let originalCurrency = null;
    
    // If currency is different from account currency, convert
    if (inputCurrency !== accountCurrency) {
      finalAmount = await convertCurrency(amount, inputCurrency, accountCurrency);
      originalAmount = amount;
      originalCurrency = inputCurrency;
    }
    
    // Verify category exists
    const categoryResult = await client.query(
      'SELECT id FROM categories WHERE id = $1 AND (user_id = $2 OR is_system = true)',
      [categoryId, userId]
    );
    
    if (categoryResult.rows.length === 0) {
      throw new ValidationError('Categoria non trovata');
    }
    
    // Create transaction
    const result = await client.query(
      `INSERT INTO transactions 
       (user_id, account_id, category_id, amount, original_amount, original_currency, type, title, note, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, account_id, category_id, amount, original_amount, original_currency, type, title, note, transaction_date, created_at, updated_at`,
      [userId, accountId, categoryId, finalAmount, originalAmount, originalCurrency, type, title, note || null, transactionDate]
    );
    
    await client.query('COMMIT');
    
    const transaction = result.rows[0];
    
    res.status(201).json({
      id: transaction.id,
      accountId: transaction.account_id,
      categoryId: transaction.category_id,
      amount: parseFloat(transaction.amount),
      originalAmount: transaction.original_amount ? parseFloat(transaction.original_amount) : null,
      originalCurrency: transaction.original_currency,
      type: transaction.type,
      title: transaction.title,
      note: transaction.note,
      transactionDate: transaction.transaction_date,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const updateTransaction = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);
    const {
      accountId,
      categoryId,
      amount,
      currency,
      type,
      title,
      note,
      transactionDate
    } = req.body;
    
    await client.query('BEGIN');
    
    // Check if transaction exists
    const checkResult = await client.query(
      'SELECT id, account_id FROM transactions WHERE id = $1 AND user_id = $2',
      [transactionId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      throw new ValidationError('Transazione non trovata');
    }
    
    // If amount or currency changed, recalculate
    let finalAmount = amount;
    let originalAmount = null;
    let originalCurrency = null;
    
    if (amount && accountId) {
      const accountResult = await client.query(
        'SELECT currency FROM accounts WHERE id = $1 AND user_id = $2',
        [accountId, userId]
      );
      
      if (accountResult.rows.length === 0) {
        throw new ValidationError('Account non trovato');
      }
      
      const accountCurrency = accountResult.rows[0].currency;
      const inputCurrency = currency || accountCurrency;
      
      if (inputCurrency !== accountCurrency) {
        finalAmount = await convertCurrency(amount, inputCurrency, accountCurrency);
        originalAmount = amount;
        originalCurrency = inputCurrency;
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (accountId !== undefined) {
      updates.push(`account_id = $${paramIndex}`);
      params.push(accountId);
      paramIndex++;
    }
    
    if (categoryId !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }
    
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      params.push(finalAmount);
      paramIndex++;
      
      updates.push(`original_amount = $${paramIndex}`);
      params.push(originalAmount);
      paramIndex++;
      
      updates.push(`original_currency = $${paramIndex}`);
      params.push(originalCurrency);
      paramIndex++;
    }
    
    if (type !== undefined) {
      updates.push(`type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    
    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }
    
    if (note !== undefined) {
      updates.push(`note = $${paramIndex}`);
      params.push(note);
      paramIndex++;
    }
    
    if (transactionDate !== undefined) {
      updates.push(`transaction_date = $${paramIndex}`);
      params.push(transactionDate);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      throw new ValidationError('Nessun campo da aggiornare');
    }
    
    params.push(transactionId, userId);
    
    const result = await client.query(
      `UPDATE transactions 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING id, account_id, category_id, amount, original_amount, original_currency, type, title, note, transaction_date, created_at, updated_at`,
      params
    );
    
    await client.query('COMMIT');
    
    const transaction = result.rows[0];
    
    res.json({
      id: transaction.id,
      accountId: transaction.account_id,
      categoryId: transaction.category_id,
      amount: parseFloat(transaction.amount),
      originalAmount: transaction.original_amount ? parseFloat(transaction.original_amount) : null,
      originalCurrency: transaction.original_currency,
      type: transaction.type,
      title: transaction.title,
      note: transaction.note,
      transactionDate: transaction.transaction_date,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const deleteTransaction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);
    
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [transactionId, userId]
    );
    
    if (result.rowCount === 0) {
      throw new ValidationError('Transazione non trovata');
    }
    
    res.json({ message: 'Transazione eliminata con successo' });
  } catch (error) {
    next(error);
  }
};


