import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token non fornito' });
    }
    
    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'tracking-spese-secret-key-30d');
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ error: 'Sessione non valida o scaduta' });
    }
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    // Verify session in database
    const sessionResult = await pool.query(
      'SELECT id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Sessione scaduta o revocata' });
    }

    // Verify user exists
    const userResult = await pool.query(
      'SELECT id, email, name, default_currency FROM users WHERE id = $1',
      [decoded.userId]
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
