import pool from '../config/database.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { convertCurrency } from '../services/currencyService.js';

export const getAllLoans = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    
    let whereClause = 'WHERE l.user_id = $1';
    const params = [userId];
    
    if (status) {
      whereClause += ` AND l.status = $2`;
      params.push(status);
    }
    
    const result = await pool.query(
      `SELECT 
        l.id,
        l.title,
        l.amount,
        l.currency,
        l.from_account_id,
        l.category_id,
        l.loan_date,
        l.status,
        l.note,
        l.created_at,
        l.updated_at,
        a.name as from_account_name,
        a.currency as from_account_currency,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        COALESCE(
          (SELECT SUM(lr.amount)
           FROM loan_repayments lr
           WHERE lr.loan_id = l.id), 0
        ) as total_repaid
      FROM loans l
      JOIN accounts a ON l.from_account_id = a.id
      JOIN categories c ON l.category_id = c.id
      ${whereClause}
      ORDER BY l.loan_date DESC, l.created_at DESC`,
      params
    );
    
    const loans = result.rows.map(loan => ({
      id: loan.id,
      title: loan.title,
      amount: parseFloat(loan.amount),
      currency: loan.currency,
      fromAccountId: loan.from_account_id,
      categoryId: loan.category_id,
      loanDate: loan.loan_date,
      status: loan.status,
      note: loan.note,
      createdAt: loan.created_at,
      updatedAt: loan.updated_at,
      fromAccountName: loan.from_account_name,
      fromAccountCurrency: loan.from_account_currency,
      categoryName: loan.category_name,
      categoryIcon: loan.category_icon,
      categoryColor: loan.category_color,
      totalRepaid: parseFloat(loan.total_repaid) || 0
    }));
    
    res.json({ loans });
  } catch (error) {
    next(error);
  }
};

export const getLoan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const loanId = parseInt(req.params.id);
    
    const loanResult = await pool.query(
      `SELECT 
        l.id,
        l.title,
        l.amount,
        l.currency,
        l.from_account_id,
        l.category_id,
        l.loan_date,
        l.status,
        l.note,
        l.created_at,
        l.updated_at,
        a.name as from_account_name,
        a.currency as from_account_currency,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM loans l
      JOIN accounts a ON l.from_account_id = a.id
      JOIN categories c ON l.category_id = c.id
      WHERE l.id = $1 AND l.user_id = $2`,
      [loanId, userId]
    );
    
    if (loanResult.rows.length === 0) {
      throw new ValidationError('Prestito non trovato');
    }
    
    const loan = loanResult.rows[0];
    
    const repaymentsResult = await pool.query(
      `SELECT 
        lr.id,
        lr.amount,
        lr.currency,
        lr.to_account_id,
        lr.repayment_date,
        lr.description,
        lr.created_at,
        a.name as to_account_name,
        a.currency as to_account_currency
      FROM loan_repayments lr
      JOIN accounts a ON lr.to_account_id = a.id
      WHERE lr.loan_id = $1
      ORDER BY lr.repayment_date DESC, lr.created_at DESC`,
      [loanId]
    );
    
    const repayments = repaymentsResult.rows.map(rep => ({
      id: rep.id,
      amount: parseFloat(rep.amount),
      currency: rep.currency,
      toAccountId: rep.to_account_id,
      repaymentDate: rep.repayment_date,
      description: rep.description,
      createdAt: rep.created_at,
      toAccountName: rep.to_account_name,
      toAccountCurrency: rep.to_account_currency
    }));
    
    const totalRepaid = repayments.reduce((sum, rep) => sum + rep.amount, 0);
    
    res.json({
      id: loan.id,
      title: loan.title,
      amount: parseFloat(loan.amount),
      currency: loan.currency,
      fromAccountId: loan.from_account_id,
      categoryId: loan.category_id,
      loanDate: loan.loan_date,
      status: loan.status,
      note: loan.note,
      createdAt: loan.created_at,
      updatedAt: loan.updated_at,
      fromAccountName: loan.from_account_name,
      fromAccountCurrency: loan.from_account_currency,
      categoryName: loan.category_name,
      categoryIcon: loan.category_icon,
      categoryColor: loan.category_color,
      repayments,
      totalRepaid
    });
  } catch (error) {
    next(error);
  }
};

export const createLoan = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const {
      title,
      amount,
      currency,
      fromAccountId,
      categoryId,
      loanDate,
      note,
      clientRequestId
    } = req.body;
    
    // Validation
    if (!title || !amount || !currency || !fromAccountId || !categoryId || !loanDate) {
      throw new ValidationError('Campi obbligatori mancanti');
    }
    
    if (amount <= 0) {
      throw new ValidationError('L\'importo deve essere positivo');
    }
    
    await client.query('BEGIN');

    // Idempotency: if already created with same request id, return it
    if (clientRequestId) {
      const existing = await client.query(
        `SELECT 
          id, title, amount, currency, from_account_id, category_id, loan_date, status, note, created_at, updated_at
         FROM loans
         WHERE user_id = $1 AND client_request_id = $2`,
        [userId, clientRequestId]
      );
      if (existing.rows.length > 0) {
        const loan = existing.rows[0];
        await client.query('COMMIT');
        return res.json({
          id: loan.id,
          title: loan.title,
          amount: parseFloat(loan.amount),
          currency: loan.currency,
          fromAccountId: loan.from_account_id,
          categoryId: loan.category_id,
          loanDate: loan.loan_date,
          status: loan.status,
          note: loan.note,
          createdAt: loan.created_at,
          updatedAt: loan.updated_at
        });
      }
    }
    
    // Verify account exists
    const accountResult = await client.query(
      'SELECT id, currency FROM accounts WHERE id = $1 AND user_id = $2',
      [fromAccountId, userId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new ValidationError('Account non trovato');
    }
    
    // Verify category exists and is expense type
    const categoryResult = await client.query(
      'SELECT id, type FROM categories WHERE id = $1 AND (user_id = $2 OR is_system = true)',
      [categoryId, userId]
    );
    
    if (categoryResult.rows.length === 0) {
      throw new ValidationError('Categoria non trovata');
    }
    
    const category = categoryResult.rows[0];
    if (category.type !== 'expense') {
      throw new ValidationError('La categoria deve essere di tipo "expense"');
    }
    
    const account = accountResult.rows[0];
    const accountCurrency = account.currency;
    const inputCurrency = currency || accountCurrency;
    
    let finalAmount = amount;
    let originalAmount = null;
    let originalCurrency = null;
    
    // Convert currency if needed
    if (inputCurrency !== accountCurrency) {
      finalAmount = await convertCurrency(amount, inputCurrency, accountCurrency);
      originalAmount = amount;
      originalCurrency = inputCurrency;
    }
    
    // Create loan
    const result = await client.query(
      `INSERT INTO loans 
       (user_id, title, amount, currency, from_account_id, category_id, loan_date, note, client_request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, client_request_id)
       DO NOTHING
       RETURNING id, title, amount, currency, from_account_id, category_id, loan_date, status, note, created_at, updated_at`,
      [userId, title, amount, currency, fromAccountId, categoryId, loanDate, note || null, clientRequestId || null]
    );

    let loan = result.rows[0];

    if (!loan && clientRequestId) {
      const existing = await client.query(
        `SELECT 
          id, title, amount, currency, from_account_id, category_id, loan_date, status, note, created_at, updated_at
         FROM loans
         WHERE user_id = $1 AND client_request_id = $2`,
        [userId, clientRequestId]
      );
      loan = existing.rows[0];
    }
    
    // Create expense transaction (money leaving fromAccount)
    await client.query(
      `INSERT INTO transactions 
       (user_id, account_id, category_id, amount, original_amount, original_currency, type, title, note, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        fromAccountId,
        categoryId,
        finalAmount,
        originalAmount,
        originalCurrency,
        'expense',
        note || title,
        note || null,
        loanDate
      ]
    );
    
    res.status(201).json({
      id: loan.id,
      title: loan.title,
      amount: parseFloat(loan.amount),
      currency: loan.currency,
      fromAccountId: loan.from_account_id,
      categoryId: loan.category_id,
      loanDate: loan.loan_date,
      status: loan.status,
      note: loan.note,
      createdAt: loan.created_at,
      updatedAt: loan.updated_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const addRepayment = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const loanId = parseInt(req.params.id);
    const {
      amount,
      currency,
      toAccountId,
      repaymentDate,
    description,
    clientRequestId
    } = req.body;
    
    // Validation
    if (!amount || !currency || !toAccountId || !repaymentDate) {
      throw new ValidationError('Campi obbligatori mancanti');
    }
    
    if (amount <= 0) {
      throw new ValidationError('L\'importo deve essere positivo');
    }
    
    await client.query('BEGIN');
    
    // Idempotency: if already inserted, return it
    if (clientRequestId) {
      const existing = await client.query(
        `SELECT 
          lr.id,
          lr.amount,
          lr.currency,
          lr.to_account_id,
          lr.repayment_date,
          lr.description,
          lr.created_at
         FROM loan_repayments lr
         WHERE lr.loan_id = $1 AND lr.client_request_id = $2`,
        [loanId, clientRequestId]
      );
      if (existing.rows.length > 0) {
        const rep = existing.rows[0];
        await client.query('COMMIT');
        return res.status(200).json({
          id: rep.id,
          loanId,
          amount: parseFloat(rep.amount),
          currency: rep.currency,
          toAccountId: rep.to_account_id,
          repaymentDate: rep.repayment_date,
          description: rep.description,
          createdAt: rep.created_at
        });
      }
    }

    // Verify loan exists and belongs to user
    const loanResult = await client.query(
      'SELECT id, amount, currency, status FROM loans WHERE id = $1 AND user_id = $2',
      [loanId, userId]
    );
    
    if (loanResult.rows.length === 0) {
      throw new ValidationError('Prestito non trovato');
    }
    
    const loan = loanResult.rows[0];
    
    if (loan.status === 'closed') {
      throw new ValidationError('Non è possibile aggiungere restituzioni a un prestito chiuso');
    }
    
    // Get total repaid so far
    const repaidResult = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as total_repaid FROM loan_repayments WHERE loan_id = $1',
      [loanId]
    );
    
    const totalRepaid = parseFloat(repaidResult.rows[0].total_repaid) || 0;
    const loanAmount = parseFloat(loan.amount);
    
    // Check if this repayment would exceed the loan amount
    if (totalRepaid + amount > loanAmount) {
      throw new ValidationError('L\'importo della restituzione supera l\'importo residuo del prestito');
    }
    
    // Get to account currency for conversion
    const toAccountResult = await client.query(
      'SELECT id, currency FROM accounts WHERE id = $1 AND user_id = $2',
      [toAccountId, userId]
    );
    
    if (toAccountResult.rows.length === 0) {
      throw new ValidationError('Account di destinazione non trovato');
    }
    
    const toAccount = toAccountResult.rows[0];
    const toAccountCurrency = toAccount.currency;
    const repaymentCurrency = currency || loan.currency;
    
    let finalRepaymentAmount = amount;
    let originalRepaymentAmount = null;
    let originalRepaymentCurrency = null;
    
    // Convert currency if needed
    if (repaymentCurrency !== toAccountCurrency) {
      finalRepaymentAmount = await convertCurrency(amount, repaymentCurrency, toAccountCurrency);
      originalRepaymentAmount = amount;
      originalRepaymentCurrency = repaymentCurrency;
    }
    
    // Get income category for repayments (look for "Restituzione" or "Regalo" or any income category)
    const incomeCategoryResult = await client.query(
      `SELECT id FROM categories 
       WHERE (user_id = $1 OR is_system = true) 
       AND type = 'income'
       ORDER BY 
         CASE WHEN name = 'Restituzione' THEN 1
              WHEN name = 'Regalo' THEN 2
              ELSE 3 END
       LIMIT 1`,
      [userId]
    );
    
    if (incomeCategoryResult.rows.length === 0) {
      throw new ValidationError('Nessuna categoria di entrata trovata. Crea una categoria di tipo "income"');
    }
    
    const incomeCategoryId = incomeCategoryResult.rows[0].id;
    
    // Create repayment
    const result = await client.query(
      `INSERT INTO loan_repayments 
       (loan_id, amount, currency, to_account_id, repayment_date, description, client_request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (loan_id, client_request_id)
       DO NOTHING
       RETURNING id, loan_id, amount, currency, to_account_id, repayment_date, description, created_at`,
      [loanId, amount, currency, toAccountId, repaymentDate, description || null, clientRequestId || null]
    );

    let repayment = result.rows[0];

    if (!repayment && clientRequestId) {
      const existing = await client.query(
        `SELECT 
          id, loan_id, amount, currency, to_account_id, repayment_date, description, created_at
         FROM loan_repayments
         WHERE loan_id = $1 AND client_request_id = $2`,
        [loanId, clientRequestId]
      );
      repayment = existing.rows[0];
    }
    
    // Create income transaction (money entering toAccount)
    await client.query(
      `INSERT INTO transactions 
       (user_id, account_id, category_id, amount, original_amount, original_currency, type, title, note, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        toAccountId,
        incomeCategoryId,
        finalRepaymentAmount,
        originalRepaymentAmount,
        originalRepaymentCurrency,
        'income',
        description || 'Restituzione prestito',
        description || 'Restituzione prestito',
        repaymentDate
      ]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      id: repayment.id,
      loanId: repayment.loan_id,
      amount: parseFloat(repayment.amount),
      currency: repayment.currency,
      toAccountId: repayment.to_account_id,
      repaymentDate: repayment.repayment_date,
      description: repayment.description,
      createdAt: repayment.created_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const closeLoan = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const loanId = parseInt(req.params.id);
    const { clientRequestId } = req.body || {};
    
    await client.query('BEGIN');
    
    // Idempotency: if already closed with same request id, return success
    if (clientRequestId) {
      const existing = await client.query(
        `SELECT status FROM loans WHERE id = $1 AND user_id = $2 AND client_request_id = $3`,
        [loanId, userId, clientRequestId]
      );
      if (existing.rows.length > 0 && existing.rows[0].status === 'closed') {
        await client.query('COMMIT');
        const repaidResult = await client.query(
          'SELECT COALESCE(SUM(amount), 0) as total_repaid FROM loan_repayments WHERE loan_id = $1',
          [loanId]
        );
        const totalRepaid = parseFloat(repaidResult.rows[0].total_repaid) || 0;
        return res.json({
          message: 'Prestito chiuso con successo',
          remainingAmount: 0,
          totalRepaid
        });
      }
    }

    // Get loan details
    const loanResult = await client.query(
      `SELECT 
        l.id,
        l.title,
        l.amount,
        l.currency,
        l.from_account_id,
        l.category_id,
        l.status,
        a.currency as account_currency
      FROM loans l
      JOIN accounts a ON l.from_account_id = a.id
      WHERE l.id = $1 AND l.user_id = $2`,
      [loanId, userId]
    );
    
    if (loanResult.rows.length === 0) {
      throw new ValidationError('Prestito non trovato');
    }
    
    const loan = loanResult.rows[0];
    
    if (loan.status === 'closed') {
      throw new ValidationError('Il prestito è già chiuso');
    }
    
    // Update loan status
    await client.query(
      'UPDATE loans SET status = $1, updated_at = CURRENT_TIMESTAMP, client_request_id = COALESCE(client_request_id, $3) WHERE id = $2',
      ['closed', loanId, clientRequestId || null]
    );
    
    await client.query('COMMIT');
    
    // Get total repaid for response
    const repaidResult = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as total_repaid FROM loan_repayments WHERE loan_id = $1',
      [loanId]
    );
    
    const totalRepaid = parseFloat(repaidResult.rows[0].total_repaid) || 0;
    const loanAmount = parseFloat(loan.amount);
    const remainingAmount = loanAmount - totalRepaid;
    
    res.json({ 
      message: 'Prestito chiuso con successo',
      remainingAmount: remainingAmount > 0 ? remainingAmount : 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const deleteLoan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const loanId = parseInt(req.params.id);
    
    // Check if loan exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM loans WHERE id = $1 AND user_id = $2',
      [loanId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      throw new ValidationError('Prestito non trovato');
    }
    
    // Delete loan (cascade will delete repayments)
    const result = await pool.query(
      'DELETE FROM loans WHERE id = $1 AND user_id = $2 RETURNING id',
      [loanId, userId]
    );
    
    if (result.rowCount === 0) {
      throw new ValidationError('Errore nell\'eliminazione del prestito');
    }
    
    res.json({ message: 'Prestito eliminato con successo' });
  } catch (error) {
    next(error);
  }
};

