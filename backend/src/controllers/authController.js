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
    
    // Note: Default categories are now created globally via migrations
    // No need to create user-specific categories during registration
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '365d' }
    );
    
    // Calculate expiry date (365 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);
    
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
  let client;
  
  try {
    console.log(`📥 Login request received from ${req.ip}`);
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      console.log('❌ Missing email or password');
      throw new ValidationError('Email e password sono obbligatori');
    }
    
    if (typeof email !== 'string' || typeof password !== 'string') {
      console.log('❌ Invalid email or password type');
      throw new ValidationError('Email e password devono essere stringhe valide');
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format');
      throw new ValidationError('Formato email non valido');
    }
    
    if (password.length < 1) {
      console.log('❌ Empty password');
      throw new ValidationError('Password non può essere vuota');
    }
    
    // Get database connection
    console.log('🔌 Getting database connection...');
    client = await pool.connect();
    console.log('✅ Database connection established');
    
    // Get user
    console.log(`🔍 Attempting login for email: ${email.toLowerCase()}`);
    const result = await client.query(
      'SELECT id, email, name, password_hash, default_currency FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ User not found for email: ${email.toLowerCase()}`);
      throw new ValidationError('Credenziali non valide');
    }
    
    const user = result.rows[0];
    
    // Verify password
    console.log(`🔐 Verifying password for user: ${user.id}`);
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      console.log(`❌ Invalid password for user: ${user.id}`);
      throw new ValidationError('Credenziali non valide');
    }
    
    console.log(`✅ Password verified for user: ${user.id}`);
    
    // Create JWT token
    console.log(`🔑 Creating JWT token...`);
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '365d' }
    );
    
    // Calculate expiry date (365 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);
    
    // Delete old sessions for this user
    console.log(`🗑️ Cleaning old sessions for user: ${user.id}`);
    await client.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    
    // Save new session
    console.log(`💾 Saving new session for user: ${user.id}`);
    await client.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );
    
    console.log(`✅ Login successful for user: ${user.id}`);
    
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
    console.error(`❌ Login error:`, error);
    console.error(`❌ Error stack:`, error.stack);
    next(error);
  } finally {
    if (client) {
      console.log('🔌 Releasing database connection');
      client.release();
    }
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


