import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { ValidationError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 10;

export const register = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const { email, password, name, defaultCurrency = 'USD' } = req.body;
    
    // Validation
    if (!email || !password) {
      throw new ValidationError('Email e password sono obbligatori');
    }
    
    if (password.length < 6) {
      throw new ValidationError('La password deve avere almeno 6 caratteri');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Email non valida');
    }
    
    await client.query('BEGIN');
    
    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      throw new ValidationError('Email già registrata');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, default_currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, default_currency`,
      [email.toLowerCase(), passwordHash, name || null, defaultCurrency]
    );
    
    const user = userResult.rows[0];
    
    // Create default account
    await client.query(
      `INSERT INTO accounts (user_id, name, icon, currency)
       VALUES ($1, 'Conto Principale', 'lucide:Wallet', $2)`,
      [user.id, defaultCurrency]
    );
    
    // Create default income categories
    const incomeCategories = [
      { name: 'Stipendio', icon: 'lucide:Briefcase', color: 'gradient-blue' },
      { name: 'Risparmi', icon: 'lucide:PiggyBank', color: 'gradient-green' },
      { name: 'Regalo', icon: 'lucide:Gift', color: 'gradient-pink' },
      { name: 'Altro', icon: 'lucide:DollarSign', color: 'gradient-purple' }
    ];
    
    for (const category of incomeCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, icon, color, type, is_system)
         VALUES ($1, $2, $3, $4, 'income', false)`,
        [user.id, category.name, category.icon, category.color]
      );
    }
    
    // Create default expense categories
    const expenseCategories = [
      { name: 'Ristorante', icon: 'lucide:Utensils', color: 'gradient-pink' },
      { name: 'Casa', icon: 'lucide:Home', color: 'gradient-blue' },
      { name: 'Abbonamenti', icon: 'lucide:CreditCard', color: 'gradient-purple' },
      { name: 'Trasporti', icon: 'lucide:Car', color: 'gradient-orange' },
      { name: 'Salute', icon: 'lucide:Heart', color: 'gradient-green' },
      { name: 'Attività Fisica', icon: 'lucide:Dumbbell', color: 'gradient-teal' },
      { name: 'Altro', icon: 'lucide:Tag', color: 'gradient-blue' }
    ];
    
    for (const category of expenseCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, icon, color, type, is_system)
         VALUES ($1, $2, $3, $4, 'expense', false)`,
        [user.id, category.name, category.icon, category.color]
      );
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '30d' }
    );
    
    // Calculate expiry date (30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Save session
    await client.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultCurrency: user.default_currency
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const login = async (req, res, next) => {
  const client = await pool.connect();
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new ValidationError('Email e password sono obbligatori');
    }
    
    // Get user
    const result = await client.query(
      'SELECT id, email, name, password_hash, default_currency FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      throw new ValidationError('Credenziali non valide');
    }
    
    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      throw new ValidationError('Credenziali non valide');
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '30d' }
    );
    
    // Calculate expiry date (30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Delete old sessions for this user
    await client.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    
    // Save new session
    await client.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultCurrency: user.default_currency
      }
    });
    
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

export const logout = async (req, res, next) => {
  try {
    // Delete session
    await pool.query('DELETE FROM sessions WHERE token = $1', [req.token]);
    
    res.json({ message: 'Logout effettuato con successo' });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, defaultCurrency } = req.body;
    
    // Validation
    if (defaultCurrency && !['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'RUB', 'BRL', 'ZAR', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'MXN', 'AED', 'SAR'].includes(defaultCurrency)) {
      throw new ValidationError('Valuta non supportata');
    }
    
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           default_currency = COALESCE($2, default_currency),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, name, default_currency, created_at, updated_at`,
      [name || null, defaultCurrency || null, userId]
    );
    
    const updatedUser = result.rows[0];
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      defaultCurrency: updatedUser.default_currency,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    });
  } catch (error) {
    next(error);
  }
};

// Cleanup expired sessions (call this periodically)
export const cleanupExpiredSessions = async () => {
  try {
    const result = await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
    console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
};


