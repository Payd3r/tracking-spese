import jwt from 'jsonwebtoken';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import pool from '../config/database.js';
import { ValidationError } from '../middleware/errorHandler.js';

const SINGLE_USER_EMAIL = 'andreamauri2013';
const JWT_SECRET = process.env.JWT_SECRET || 'tracking-spese-secret-key-30d';
const SESSION_EXPIRY_DAYS = 30;

const getRPID = (req) => {
  if (process.env.RP_ID) return process.env.RP_ID;
  const forwardedHost = req.get('x-forwarded-host');
  const hostHeader = req.get('host');
  const host = forwardedHost || hostHeader || req.hostname || 'localhost';
  return host.split(':')[0];
};

const getOrigins = (req) => {
  const origins = new Set();
  const reqOrigin = req.get('origin');
  if (reqOrigin) origins.add(reqOrigin);
  if (process.env.FRONTEND_URL) origins.add(process.env.FRONTEND_URL);
  origins.add('http://localhost:5173');
  origins.add('http://localhost:8080');
  origins.add('https://spese.andrea-mauri.duckdns.org');
  return Array.from(origins);
};

export const getSingleUser = async (clientOrPool = pool) => {
  const result = await clientOrPool.query(
    `SELECT id, email, name, default_currency FROM users WHERE LOWER(email) IN ($1, $2) ORDER BY created_at ASC LIMIT 1`,
    [SINGLE_USER_EMAIL.toLowerCase(), `${SINGLE_USER_EMAIL.toLowerCase()}@gmail.com`]
  );
  
  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const createResult = await clientOrPool.query(
    `INSERT INTO users (email, password_hash, name, default_currency)
     VALUES ($1, 'passkey_user', 'Andrea Mauri', 'EUR')
     RETURNING id, email, name, default_currency`,
    [SINGLE_USER_EMAIL]
  );
  const user = createResult.rows[0];

  const accResult = await clientOrPool.query('SELECT id FROM accounts WHERE user_id = $1', [user.id]);
  if (accResult.rows.length === 0) {
    await clientOrPool.query(
      `INSERT INTO accounts (user_id, name, icon, currency) VALUES ($1, 'Conto Principale', 'lucide:Wallet', 'EUR')`,
      [user.id]
    );
  }

  return user;
};

// Returns whether passkey is registered
export const getPasskeyStatus = async (req, res, next) => {
  try {
    const user = await getSingleUser();
    const result = await pool.query(
      'SELECT COUNT(*) FROM authenticators WHERE user_id = $1',
      [user.id]
    );
    const count = parseInt(result.rows[0].count, 10);
    res.json({
      hasPasskey: count > 0,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

// Generate registration options
export const generatePasskeyRegisterOptions = async (req, res, next) => {
  try {
    const user = await getSingleUser();
    const rpID = getRPID(req);

    // Fetch existing authenticators
    const authResult = await pool.query(
      'SELECT credential_id, transports FROM authenticators WHERE user_id = $1',
      [user.id]
    );

    const excludeCredentials = authResult.rows.map((row) => ({
      id: row.credential_id,
      transports: row.transports || [],
    }));

    // Convert string UUID to Uint8Array for simplewebauthn
    const userID = Buffer.from(user.id.replace(/-/g, ''), 'hex');

    const options = await generateRegistrationOptions({
      rpName: 'Tracking Spese',
      rpID,
      userID,
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await pool.query(
      'INSERT INTO passkey_challenges (challenge, user_id, expires_at) VALUES ($1, $2, $3)',
      [options.challenge, user.id, expiresAt]
    );

    res.json(options);
  } catch (error) {
    next(error);
  }
};

// Verify registration response
export const verifyPasskeyRegistration = async (req, res, next) => {
  try {
    const user = await getSingleUser();
    const body = req.body;
    const rpID = getRPID(req);
    const expectedOrigin = getOrigins(req);

    // Get active challenge
    const chalResult = await pool.query(
      `SELECT id, challenge FROM passkey_challenges 
       WHERE user_id = $1 AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (chalResult.rows.length === 0) {
      throw new ValidationError('Sfida per passkey scaduta o non trovata. Riprova.');
    }

    const expectedChallenge = chalResult.rows[0].challenge;

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new ValidationError('Registrazione passkey fallita');
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Clean used challenge
    await pool.query('DELETE FROM passkey_challenges WHERE user_id = $1', [user.id]);

    // Save credential in authenticators table
    await pool.query(
      `INSERT INTO authenticators (user_id, credential_id, public_key, counter, transports, device_type, backed_up)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (credential_id) DO UPDATE SET
         public_key = EXCLUDED.public_key,
         counter = EXCLUDED.counter,
         transports = EXCLUDED.transports`,
      [
        user.id,
        credential.id,
        Buffer.from(credential.publicKey),
        credential.counter,
        credential.transports || [],
        credentialDeviceType,
        credentialBackedUp,
      ]
    );

    // Create session for 30 days
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: `${SESSION_EXPIRY_DAYS}d` });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    await pool.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultCurrency: user.default_currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Generate authentication options
export const generatePasskeyLoginOptions = async (req, res, next) => {
  try {
    const user = await getSingleUser();
    const rpID = getRPID(req);

    const authResult = await pool.query(
      'SELECT credential_id, transports FROM authenticators WHERE user_id = $1',
      [user.id]
    );

    if (authResult.rows.length === 0) {
      throw new ValidationError('Nessuna Passkey registrata. Registra prima la tua Passkey.');
    }

    const allowCredentials = authResult.rows.map((row) => ({
      id: row.credential_id,
      transports: row.transports || [],
    }));

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query(
      'INSERT INTO passkey_challenges (challenge, user_id, expires_at) VALUES ($1, $2, $3)',
      [options.challenge, user.id, expiresAt]
    );

    res.json(options);
  } catch (error) {
    next(error);
  }
};

// Verify authentication response
export const verifyPasskeyLogin = async (req, res, next) => {
  try {
    const user = await getSingleUser();
    const body = req.body;
    const rpID = getRPID(req);
    const expectedOrigin = getOrigins(req);

    // Get active challenge
    const chalResult = await pool.query(
      `SELECT id, challenge FROM passkey_challenges 
       WHERE user_id = $1 AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (chalResult.rows.length === 0) {
      throw new ValidationError('Sfida passkey scaduta o non trovata. Riprova.');
    }

    const expectedChallenge = chalResult.rows[0].challenge;

    // Find authenticator in DB
    const authResult = await pool.query(
      'SELECT credential_id, public_key, counter, transports FROM authenticators WHERE credential_id = $1 AND user_id = $2',
      [body.id, user.id]
    );

    if (authResult.rows.length === 0) {
      throw new ValidationError('Passkey sconosciuta o non corrispondente all\'account.');
    }

    const dbAuth = authResult.rows[0];

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: dbAuth.credential_id,
        publicKey: new Uint8Array(dbAuth.public_key),
        counter: parseInt(dbAuth.counter, 10),
        transports: dbAuth.transports || [],
      },
    });

    if (!verification.verified) {
      throw new ValidationError('Autenticazione Passkey fallita');
    }

    // Clean challenge
    await pool.query('DELETE FROM passkey_challenges WHERE user_id = $1', [user.id]);

    // Update counter
    const newCounter = verification.authenticationInfo.newCounter;
    await pool.query('UPDATE authenticators SET counter = $1 WHERE credential_id = $2', [
      newCounter,
      dbAuth.credential_id,
    ]);

    // Create session for 30 days
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: `${SESSION_EXPIRY_DAYS}d` });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    await pool.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultCurrency: user.default_currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.token) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [req.token]);
    }
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

    if (
      defaultCurrency &&
      ![
        'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'RUB',
        'BRL', 'ZAR', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'MXN', 'AED', 'SAR'
      ].includes(defaultCurrency)
    ) {
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
      updatedAt: updatedUser.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

export const cleanupExpiredSessions = async () => {
  try {
    const result = await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
    await pool.query('DELETE FROM passkey_challenges WHERE expires_at < NOW()');
    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
    }
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
};
