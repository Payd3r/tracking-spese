import pool from '../config/database.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { convertCurrency } from '../services/currencyService.js';

const getSystemCategoryId = async (client, { type, name }) => {
  const result = await client.query(
    `SELECT id FROM categories
     WHERE user_id IS NULL
       AND is_system = true
       AND type = $1
       AND name = $2
     LIMIT 1`,
    [type, name]
  );

  if (result.rows.length === 0) {
    throw new ValidationError(`Categoria di sistema "${name}" non trovata. Esegui le migrazioni.`);
  }

  return result.rows[0].id;
};

const assertLoanAdmin = (req) => {
  const username = req.body?.username || req.headers['x-loan-admin-user'];
  const password = req.body?.password || req.headers['x-loan-admin-password'];

  if (username !== 'admin' || password !== 'soniaculo2003') {
    throw new ValidationError('Credenziali admin non valide');
  }
};

export const validateLoanAdmin = async (req, res, next) => {
  try {
    assertLoanAdmin(req);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};

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
       ON CONFLICT DO NOTHING
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
    
    const loanAdvanceCategoryId = await getSystemCategoryId(client, {
      type: 'expense',
      name: 'Prestito'
    });

    // Create excluded expense transaction (money leaving fromAccount).
    // The real expense is recorded only for any unpaid amount when the loan is closed.
    await client.query(
      `INSERT INTO transactions 
       (user_id, account_id, category_id, amount, original_amount, original_currency, type, title, note, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        fromAccountId,
        loanAdvanceCategoryId,
        finalAmount,
        originalAmount,
        originalCurrency,
        'expense',
        note || title,
        note || null,
        loanDate
      ]
    );

    await client.query('COMMIT');
    
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

export const convertTransactionToLoan = async (req, res, next) => {
  const client = await pool.connect();

  try {
    assertLoanAdmin(req);

    const userId = req.user.id;
    const transactionId = parseInt(req.body.transactionId, 10);
    const categoryId = parseInt(req.body.categoryId, 10);
    const title = String(req.body.title || '').trim();
    const note = req.body.note ? String(req.body.note).trim() : null;

    if (!Number.isFinite(transactionId) || transactionId <= 0) {
      throw new ValidationError('Transazione non valida');
    }

    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      throw new ValidationError('Categoria finale non valida');
    }

    if (!title) {
      throw new ValidationError('Titolo prestito obbligatorio');
    }

    await client.query('BEGIN');

    const transactionResult = await client.query(
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
        a.currency as account_currency,
        c.name as category_name,
        c.exclude_from_totals as category_exclude_from_totals
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1 AND t.user_id = $2
       FOR UPDATE`,
      [transactionId, userId]
    );

    if (transactionResult.rows.length === 0) {
      throw new ValidationError('Transazione non trovata');
    }

    const transaction = transactionResult.rows[0];
    if (transaction.type !== 'expense') {
      throw new ValidationError('Puoi convertire in prestito solo una transazione di uscita');
    }

    if (transaction.category_name === 'Prestito' || transaction.category_exclude_from_totals === true) {
      throw new ValidationError('Questa transazione risulta gia tecnica/esclusa dai totali');
    }

    const categoryResult = await client.query(
      `SELECT id, type, exclude_from_totals
       FROM categories
       WHERE id = $1 AND (user_id = $2 OR is_system = true)`,
      [categoryId, userId]
    );

    if (categoryResult.rows.length === 0 || categoryResult.rows[0].type !== 'expense') {
      throw new ValidationError('Categoria finale non trovata o non di uscita');
    }

    if (categoryResult.rows[0].exclude_from_totals === true) {
      throw new ValidationError('La categoria finale deve essere una categoria conteggiabile');
    }

    const loanAdvanceCategoryId = await getSystemCategoryId(client, {
      type: 'expense',
      name: 'Prestito'
    });

    const loanAmount = transaction.original_amount
      ? parseFloat(transaction.original_amount)
      : parseFloat(transaction.amount);
    const loanCurrency = transaction.original_currency || transaction.account_currency;

    const loanResult = await client.query(
      `INSERT INTO loans
       (user_id, title, amount, currency, from_account_id, category_id, loan_date, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, amount, currency, from_account_id, category_id, loan_date, status, note, created_at, updated_at`,
      [
        userId,
        title,
        loanAmount,
        loanCurrency,
        transaction.account_id,
        categoryId,
        transaction.transaction_date,
        note || transaction.note || transaction.title
      ]
    );

    await client.query(
      `UPDATE transactions
       SET category_id = $1,
           title = $2,
           note = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5`,
      [
        loanAdvanceCategoryId,
        transaction.title || title,
        note || transaction.note || `Prestito convertito: ${title}`,
        transactionId,
        userId
      ]
    );

    await client.query('COMMIT');

    const loan = loanResult.rows[0];
    res.status(201).json({
      loan: {
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
      },
      convertedTransactionId: transactionId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const attachRepaymentTransaction = async (req, res, next) => {
  const client = await pool.connect();

  try {
    assertLoanAdmin(req);

    const userId = req.user.id;
    const loanId = parseInt(req.params.id, 10);
    const transactionId = parseInt(req.body.transactionId, 10);
    const description = req.body.description ? String(req.body.description).trim() : null;

    if (!Number.isFinite(loanId) || loanId <= 0) {
      throw new ValidationError('Prestito non valido');
    }

    if (!Number.isFinite(transactionId) || transactionId <= 0) {
      throw new ValidationError('Transazione non valida');
    }

    await client.query('BEGIN');

    const loanResult = await client.query(
      `SELECT id, amount, currency, status
       FROM loans
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [loanId, userId]
    );

    if (loanResult.rows.length === 0) {
      throw new ValidationError('Prestito non trovato');
    }

    const loan = loanResult.rows[0];
    if (loan.status === 'closed') {
      throw new ValidationError('Non puoi collegare restituzioni a un prestito chiuso');
    }

    const transactionResult = await client.query(
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
        a.currency as account_currency,
        c.name as category_name,
        c.exclude_from_totals as category_exclude_from_totals
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1 AND t.user_id = $2
       FOR UPDATE`,
      [transactionId, userId]
    );

    if (transactionResult.rows.length === 0) {
      throw new ValidationError('Transazione non trovata');
    }

    const transaction = transactionResult.rows[0];
    if (transaction.type !== 'income') {
      throw new ValidationError('Puoi collegare come restituzione solo una transazione di entrata');
    }

    if (transaction.category_name === 'Restituzione prestito' || transaction.category_exclude_from_totals === true) {
      throw new ValidationError('Questa transazione risulta gia tecnica/esclusa dai totali');
    }

    const repaymentSourceAmount = transaction.original_amount
      ? parseFloat(transaction.original_amount)
      : parseFloat(transaction.amount);
    const repaymentSourceCurrency = transaction.original_currency || transaction.account_currency;
    const repaymentAmount = repaymentSourceCurrency === loan.currency
      ? repaymentSourceAmount
      : await convertCurrency(repaymentSourceAmount, repaymentSourceCurrency, loan.currency);

    const repaidResult = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as total_repaid FROM loan_repayments WHERE loan_id = $1',
      [loanId]
    );

    const totalRepaid = parseFloat(repaidResult.rows[0].total_repaid) || 0;
    const loanAmount = parseFloat(loan.amount);
    const remainingBeforeRepayment = Math.max(loanAmount - totalRepaid, 0);

    if (remainingBeforeRepayment <= 0) {
      throw new ValidationError('Il prestito risulta gia completamente restituito');
    }

    const appliedRepaymentAmount = Math.min(repaymentAmount, remainingBeforeRepayment);
    const transactionAccountAmount = parseFloat(transaction.amount);
    const appliedAccountAmount = loan.currency === transaction.account_currency
      ? appliedRepaymentAmount
      : await convertCurrency(appliedRepaymentAmount, loan.currency, transaction.account_currency);
    const extraAccountAmount = Math.max(transactionAccountAmount - appliedAccountAmount, 0);

    const repaymentCategoryId = await getSystemCategoryId(client, {
      type: 'income',
      name: 'Restituzione prestito'
    });

    const repaymentResult = await client.query(
      `INSERT INTO loan_repayments
       (loan_id, amount, currency, to_account_id, repayment_date, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, loan_id, amount, currency, to_account_id, repayment_date, description, created_at`,
      [
        loanId,
        appliedRepaymentAmount,
        loan.currency,
        transaction.account_id,
        transaction.transaction_date,
        description || transaction.note || transaction.title || 'Restituzione prestito'
      ]
    );

    await client.query(
      `UPDATE transactions
       SET category_id = $1,
           amount = $2,
           original_amount = NULL,
           original_currency = NULL,
           note = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5`,
      [
        repaymentCategoryId,
        appliedAccountAmount,
        description || transaction.note || 'Restituzione prestito collegata',
        transactionId,
        userId
      ]
    );

    let extraTransaction = null;
    if (extraAccountAmount > 0.005) {
      const extraResult = await client.query(
        `INSERT INTO transactions
         (user_id, account_id, category_id, amount, original_amount, original_currency, type, title, note, transaction_date)
         VALUES ($1, $2, $3, $4, NULL, NULL, 'income', $5, $6, $7)
         RETURNING id, account_id, category_id, amount, type, title, note, transaction_date, created_at, updated_at`,
        [
          userId,
          transaction.account_id,
          transaction.category_id,
          extraAccountAmount,
          `Eccedenza restituzione: ${transaction.title}`,
          description || transaction.note || 'Eccedenza oltre il residuo del prestito',
          transaction.transaction_date
        ]
      );
      extraTransaction = extraResult.rows[0];
    }

    await client.query('COMMIT');

    const repayment = repaymentResult.rows[0];
    res.status(201).json({
      repayment: {
        id: repayment.id,
        loanId: repayment.loan_id,
        amount: parseFloat(repayment.amount),
        currency: repayment.currency,
        toAccountId: repayment.to_account_id,
        repaymentDate: repayment.repayment_date,
        description: repayment.description,
        createdAt: repayment.created_at
      },
      convertedTransactionId: transactionId,
      extraTransaction: extraTransaction ? {
        id: extraTransaction.id,
        accountId: extraTransaction.account_id,
        categoryId: extraTransaction.category_id,
        amount: parseFloat(extraTransaction.amount),
        type: extraTransaction.type,
        title: extraTransaction.title,
        note: extraTransaction.note,
        transactionDate: extraTransaction.transaction_date,
        createdAt: extraTransaction.created_at,
        updatedAt: extraTransaction.updated_at
      } : null,
      totalRepaid: totalRepaid + appliedRepaymentAmount,
      remainingAmount: Math.max(loanAmount - totalRepaid - appliedRepaymentAmount, 0)
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
    const loanId = parseInt(req.params.id, 10);
    const {
      currency,
      repaymentDate,
      description,
      clientRequestId
    } = req.body;

    const amount = Number(req.body.amount);
    const toAccountId = parseInt(String(req.body.toAccountId), 10);

    await client.query('BEGIN');

    if (!Number.isFinite(loanId) || loanId <= 0) {
      throw new ValidationError('Prestito non valido');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('L\'importo deve essere positivo');
    }

    if (!currency || !repaymentDate) {
      throw new ValidationError('Campi obbligatori mancanti');
    }

    if (!Number.isFinite(toAccountId) || toAccountId <= 0) {
      throw new ValidationError('Conto di destinazione non valido');
    }
    
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
    
    const incomeCategoryId = await getSystemCategoryId(client, {
      type: 'income',
      name: 'Restituzione prestito'
    });
    
    // Create repayment
    const result = await client.query(
      `INSERT INTO loan_repayments 
       (loan_id, amount, currency, to_account_id, repayment_date, description, client_request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING
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

    if (!repayment) {
      throw new ValidationError('Impossibile registrare la restituzione');
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
    
    // Get total repaid before closing, so any unpaid amount can become the only counted expense.
    const repaidResult = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as total_repaid FROM loan_repayments WHERE loan_id = $1',
      [loanId]
    );
    
    const totalRepaid = parseFloat(repaidResult.rows[0].total_repaid) || 0;
    const loanAmount = parseFloat(loan.amount);
    const remainingAmount = loanAmount - totalRepaid;

    if (remainingAmount > 0) {
      let finalRemainingAmount = remainingAmount;
      let originalRemainingAmount = null;
      let originalRemainingCurrency = null;

      if (loan.currency !== loan.account_currency) {
        finalRemainingAmount = await convertCurrency(remainingAmount, loan.currency, loan.account_currency);
        originalRemainingAmount = remainingAmount;
        originalRemainingCurrency = loan.currency;
      }

      await client.query(
        `INSERT INTO transactions
         (user_id, account_id, category_id, amount, original_amount, original_currency, type, title, note, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6, 'expense', $7, $8, CURRENT_TIMESTAMP)`,
        [
          userId,
          loan.from_account_id,
          loan.category_id,
          finalRemainingAmount,
          originalRemainingAmount,
          originalRemainingCurrency,
          `Chiusura prestito: ${loan.title}`,
          `Importo non restituito del prestito "${loan.title}"`
        ]
      );
    }

    // Update loan status
    await client.query(
      'UPDATE loans SET status = $1, updated_at = CURRENT_TIMESTAMP, client_request_id = COALESCE(client_request_id, $3) WHERE id = $2',
      ['closed', loanId, clientRequestId || null]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Prestito chiuso con successo',
      remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
      totalRepaid
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
