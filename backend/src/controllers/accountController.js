import pool from '../config/database.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { convertCurrency } from '../services/currencyService.js';

export const getAccounts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        a.id, 
        a.name, 
        a.icon, 
        a.currency,
        COALESCE(
          (SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)
           FROM transactions WHERE account_id = a.id), 0
        ) +
        COALESCE(
          (SELECT SUM(to_amount) FROM transfers WHERE to_account_id = a.id), 0
        ) -
        COALESCE(
          (SELECT SUM(from_amount) FROM transfers WHERE from_account_id = a.id), 0
        ) as balance,
        a.created_at,
        a.updated_at
       FROM accounts a
       WHERE a.user_id = $1
       ORDER BY a.created_at ASC`,
      [userId]
    );
    
    const accounts = result.rows.map(acc => ({
      id: acc.id,
      name: acc.name,
      icon: acc.icon,
      currency: acc.currency,
      balance: parseFloat(acc.balance),
      createdAt: acc.created_at,
      updatedAt: acc.updated_at
    }));
    
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
};

export const getAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.id);
    
    const result = await pool.query(
      `SELECT 
        a.id, 
        a.name, 
        a.icon, 
        a.currency,
        COALESCE(
          (SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)
           FROM transactions WHERE account_id = a.id), 0
        ) +
        COALESCE(
          (SELECT SUM(to_amount) FROM transfers WHERE to_account_id = a.id), 0
        ) -
        COALESCE(
          (SELECT SUM(from_amount) FROM transfers WHERE from_account_id = a.id), 0
        ) as balance,
        a.created_at,
        a.updated_at
       FROM accounts a
       WHERE a.id = $1 AND a.user_id = $2`,
      [accountId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new ValidationError('Account non trovato');
    }
    
    const acc = result.rows[0];
    
    res.json({
      id: acc.id,
      name: acc.name,
      icon: acc.icon,
      currency: acc.currency,
      balance: parseFloat(acc.balance),
      createdAt: acc.created_at,
      updatedAt: acc.updated_at
    });
  } catch (error) {
    next(error);
  }
};

export const createAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, icon, currency } = req.body;
    
    if (!name || !currency) {
      throw new ValidationError('Nome e valuta sono obbligatori');
    }
    
    const result = await pool.query(
      `INSERT INTO accounts (user_id, name, icon, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, icon, currency, created_at, updated_at`,
      [userId, name, icon || null, currency]
    );
    
    const account = result.rows[0];
    
    res.status(201).json({
      id: account.id,
      name: account.name,
      icon: account.icon,
      currency: account.currency,
      balance: 0,
      createdAt: account.created_at,
      updatedAt: account.updated_at
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.id);
    const { name, icon, currency } = req.body;
    
    // Check if account exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      throw new ValidationError('Account non trovato');
    }
    
    const result = await pool.query(
      `UPDATE accounts 
       SET name = COALESCE($1, name),
           icon = COALESCE($2, icon),
           currency = COALESCE($3, currency)
       WHERE id = $4 AND user_id = $5
       RETURNING id, name, icon, currency, created_at, updated_at`,
      [name || null, icon || null, currency || null, accountId, userId]
    );
    
    const account = result.rows[0];
    
    res.json({
      id: account.id,
      name: account.name,
      icon: account.icon,
      currency: account.currency,
      createdAt: account.created_at,
      updatedAt: account.updated_at
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const accountId = parseInt(req.params.id);
    
    await client.query('BEGIN');
    
    // Check if account exists and belongs to user
    const checkResult = await client.query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      throw new ValidationError('Account non trovato');
    }
    
    // Check if there are transactions
    const transactionsResult = await client.query(
      'SELECT COUNT(*) as count FROM transactions WHERE account_id = $1',
      [accountId]
    );
    
    if (parseInt(transactionsResult.rows[0].count) > 0) {
      throw new ValidationError('Impossibile eliminare un account con transazioni. Elimina prima le transazioni.');
    }
    
    // Check if there are transfers
    const transfersResult = await client.query(
      'SELECT COUNT(*) as count FROM transfers WHERE from_account_id = $1 OR to_account_id = $1',
      [accountId]
    );
    
    if (parseInt(transfersResult.rows[0].count) > 0) {
      throw new ValidationError('Impossibile eliminare un account con trasferimenti. Elimina prima i trasferimenti.');
    }
    
    // Delete account
    await client.query('DELETE FROM accounts WHERE id = $1', [accountId]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'Account eliminato con successo' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};


