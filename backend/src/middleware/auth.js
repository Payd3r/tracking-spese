import { createClerkClient } from '@clerk/backend';
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
    
    // Get user from Clerk API using secret key
    let email;
    let userName = null;
    
    try {
      if (!process.env.CLERK_SECRET_KEY) {
        throw new Error('CLERK_SECRET_KEY not configured');
      }
      
      const clerk = createClerkClient({ 
        secretKey: process.env.CLERK_SECRET_KEY 
      });
      
      const clerkUser = await clerk.users.getUser(clerkUserId);
      
      // Extract email - Clerk user object structure
      if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
        email = clerkUser.emailAddresses[0].emailAddress;
      } else if (clerkUser.primaryEmailAddress) {
        email = clerkUser.primaryEmailAddress.emailAddress;
      }
      
      // Extract name
      userName = clerkUser.firstName || 
                 clerkUser.lastName || 
                 clerkUser.username || 
                 null;
      
      if (!email) {
        console.error('Email not found in Clerk user object. User keys:', Object.keys(clerkUser));
        return res.status(401).json({ error: 'Email non trovata nel profilo Clerk' });
      }
    } catch (error) {
      console.error('Clerk API call failed:', error.message || error);
      console.error('Error stack:', error.stack);
      return res.status(401).json({ 
        error: 'Errore durante la verifica del token Clerk',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
        [email.toLowerCase(), 'clerk_user_no_password', userName, 'EUR']
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
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Errore di autenticazione' });
  }
};
