import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token non fornito' });
    }
    
    const token = authHeader.substring(7);
    
    // Decode Clerk JWT token to extract user info
    let decoded;
    try {
      decoded = jwt.decode(token, { complete: true });
    } catch (error) {
      console.error('Token decode failed:', error);
      return res.status(401).json({ error: 'Token non valido' });
    }
    
    if (!decoded || !decoded.payload) {
      return res.status(401).json({ error: 'Token non valido' });
    }
    
    const payload = decoded.payload;
    
    // Extract email from Clerk JWT payload
    // Clerk JWT structure: the email might be in various places in the payload
    // Try common locations
    const email = payload.email || 
                  payload.primary_email_address?.email_address ||
                  payload.primary_email_address ||
                  payload.email_addresses?.[0]?.email_address;
    
    if (!email) {
      console.error('Email not found in payload. Payload keys:', Object.keys(payload));
      return res.status(401).json({ error: 'Email non trovata nel token' });
    }
    
    // Find or create user in database
    let userResult = await pool.query(
      'SELECT id, email, name, default_currency FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    let user;
    if (userResult.rows.length === 0) {
      // Create user if doesn't exist
      // Use placeholder for password_hash since Clerk users don't have passwords
      const createResult = await pool.query(
        `INSERT INTO users (email, password_hash, name, default_currency)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, default_currency`,
        [email.toLowerCase(), 'clerk_user_no_password', payload.name || payload.first_name || null, 'EUR']
      );
      user = createResult.rows[0];
    } else {
      user = userResult.rows[0];
    }
    
    req.user = user;
    req.clerkUserId = payload.sub;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Errore di autenticazione' });
  }
};
