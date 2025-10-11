import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token non fornito' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }
    
    // Check if session exists and is not expired
    const { rows } = await pool.query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Sessione scaduta o non valida' });
    }
    
    // Get user info
    const userResult = await pool.query(
      'SELECT id, email, name, default_currency FROM users WHERE id = $1',
      [rows[0].user_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }
    
    req.user = userResult.rows[0];
    req.token = token;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Errore di autenticazione' });
  }
};


