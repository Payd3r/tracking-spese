import { clerkClient } from '@clerk/backend';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token non fornito' });
    }
    
    const token = authHeader.substring(7);
    
    // Decode Clerk JWT token to get user ID (sub)
    let decoded;
    try {
      decoded = jwt.decode(token, { complete: true });
    } catch (error) {
      console.error('Token decode failed:', error);
      return res.status(401).json({ error: 'Token non valido' });
    }
    
    if (!decoded || !decoded.payload || !decoded.payload.sub) {
      return res.status(401).json({ error: 'Token non valido' });
    }
    
    const clerkUserId = decoded.payload.sub;
    
    // Get user from Clerk using the secret key
    let clerkUser;
    try {
      const clerk = clerkClient({
        secretKey: process.env.CLERK_SECRET_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY?.replace('pk_', 'sk_')
      });
      clerkUser = await clerk.users.getUser(clerkUserId);
    } catch (error) {
      console.error('Clerk user fetch failed:', error);
      // Fallback: try to extract email from JWT payload directly
      const payload = decoded.payload;
      const email = payload.email || payload.primary_email_address?.email_address || payload.email_addresses?.[0]?.email_address;
      
      if (!email) {
        return res.status(401).json({ error: 'Impossibile recuperare informazioni utente' });
      }
      
      // Use email from token if Clerk API fails
      let userResult = await pool.query(
        'SELECT id, email, name, default_currency FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (userResult.rows.length === 0) {
        const createResult = await pool.query(
          `INSERT INTO users (email, password_hash, name, default_currency)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, name, default_currency`,
          [email.toLowerCase(), 'clerk_user_no_password', payload.name || payload.first_name || null, 'EUR']
        );
        req.user = createResult.rows[0];
      } else {
        req.user = userResult.rows[0];
      }
      req.clerkUserId = clerkUserId;
      return next();
    }
    
    // Get email from Clerk user object
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || 
                  clerkUser.primaryEmailAddress?.emailAddress;
    
    if (!email) {
      return res.status(401).json({ error: 'Email non trovata' });
    }
    
    // Find or create user in database
    let userResult = await pool.query(
      'SELECT id, email, name, default_currency FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    let user;
    if (userResult.rows.length === 0) {
      // Create user if doesn't exist
      const createResult = await pool.query(
        `INSERT INTO users (email, password_hash, name, default_currency)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, default_currency`,
        [email.toLowerCase(), 'clerk_user_no_password', clerkUser.firstName || clerkUser.username || null, 'EUR']
      );
      user = createResult.rows[0];
    } else {
      user = userResult.rows[0];
    }
    
    req.user = user;
    req.clerkUserId = clerkUserId;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Errore di autenticazione' });
  }
};
