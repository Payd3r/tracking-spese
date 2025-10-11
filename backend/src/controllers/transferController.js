import pool from '../config/database.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { convertCurrency } from '../services/currencyService.js';

export const getTransfers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await pool.query(
      `SELECT 
        t.id,
        t.from_account_id,
        t.to_account_id,
        t.from_amount,
        t.to_amount,
        t.transfer_date,
        t.note,
        t.created_at,
        fa.name as from_account_name,
        fa.currency as from_currency,
        fa.icon as from_icon,
        ta.name as to_account_name,
        ta.currency as to_currency,
        ta.icon as to_icon
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      WHERE t.user_id = $1
      ORDER BY t.transfer_date DESC, t.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );
    
    const transfers = result.rows.map(t => ({
      id: t.id,
      fromAccountId: t.from_account_id,
      fromAccountName: t.from_account_name,
      fromCurrency: t.from_currency,
      fromIcon: t.from_icon,
      fromAmount: parseFloat(t.from_amount),
      toAccountId: t.to_account_id,
      toAccountName: t.to_account_name,
      toCurrency: t.to_currency,
      toIcon: t.to_icon,
      toAmount: parseFloat(t.to_amount),
      transferDate: t.transfer_date,
      note: t.note,
      createdAt: t.created_at
    }));
    
    res.json({ transfers });
  } catch (error) {
    next(error);
  }
};

export const getTransfer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const transferId = parseInt(req.params.id);
    
    const result = await pool.query(
      `SELECT 
        t.id,
        t.from_account_id,
        t.to_account_id,
        t.from_amount,
        t.to_amount,
        t.transfer_date,
        t.note,
        t.created_at,
        fa.name as from_account_name,
        fa.currency as from_currency,
        fa.icon as from_icon,
        ta.name as to_account_name,
        ta.currency as to_currency,
        ta.icon as to_icon
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      WHERE t.id = $1 AND t.user_id = $2`,
      [transferId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new ValidationError('Trasferimento non trovato');
    }
    
    const t = result.rows[0];
    
    res.json({
      id: t.id,
      fromAccountId: t.from_account_id,
      fromAccountName: t.from_account_name,
      fromCurrency: t.from_currency,
      fromIcon: t.from_icon,
      fromAmount: parseFloat(t.from_amount),
      toAccountId: t.to_account_id,
      toAccountName: t.to_account_name,
      toCurrency: t.to_currency,
      toIcon: t.to_icon,
      toAmount: parseFloat(t.to_amount),
      transferDate: t.transfer_date,
      note: t.note,
      createdAt: t.created_at
    });
  } catch (error) {
    next(error);
  }
};

export const createTransfer = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const {
      fromAccountId,
      toAccountId,
      amount,
      transferDate,
      note
    } = req.body;
    
    // Validation
    if (!fromAccountId || !toAccountId || !amount || !transferDate) {
      throw new ValidationError('Campi obbligatori mancanti');
    }
    
    if (fromAccountId === toAccountId) {
      throw new ValidationError('I conti di origine e destinazione devono essere diversi');
    }
    
    if (amount <= 0) {
      throw new ValidationError('L\'importo deve essere positivo');
    }
    
    await client.query('BEGIN');
    
    // Get both accounts
    const accountsResult = await client.query(
      'SELECT id, currency FROM accounts WHERE id = ANY($1) AND user_id = $2',
      [[fromAccountId, toAccountId], userId]
    );
    
    if (accountsResult.rows.length !== 2) {
      throw new ValidationError('Uno o entrambi i conti non sono stati trovati');
    }
    
    const fromAccount = accountsResult.rows.find(a => a.id === fromAccountId);
    const toAccount = accountsResult.rows.find(a => a.id === toAccountId);
    
    let fromAmount = amount;
    let toAmount = amount;
    
    // If currencies are different, convert
    if (fromAccount.currency !== toAccount.currency) {
      toAmount = await convertCurrency(amount, fromAccount.currency, toAccount.currency);
    }
    
    // Create transfer
    const result = await client.query(
      `INSERT INTO transfers 
       (user_id, from_account_id, to_account_id, from_amount, to_amount, transfer_date, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, from_account_id, to_account_id, from_amount, to_amount, transfer_date, note, created_at`,
      [userId, fromAccountId, toAccountId, fromAmount, toAmount, transferDate, note || null]
    );
    
    await client.query('COMMIT');
    
    const transfer = result.rows[0];
    
    res.status(201).json({
      id: transfer.id,
      fromAccountId: transfer.from_account_id,
      toAccountId: transfer.to_account_id,
      fromAmount: parseFloat(transfer.from_amount),
      toAmount: parseFloat(transfer.to_amount),
      transferDate: transfer.transfer_date,
      note: transfer.note,
      createdAt: transfer.created_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const deleteTransfer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const transferId = parseInt(req.params.id);
    
    const result = await pool.query(
      'DELETE FROM transfers WHERE id = $1 AND user_id = $2 RETURNING id',
      [transferId, userId]
    );
    
    if (result.rowCount === 0) {
      throw new ValidationError('Trasferimento non trovato');
    }
    
    res.json({ message: 'Trasferimento eliminato con successo' });
  } catch (error) {
    next(error);
  }
};


