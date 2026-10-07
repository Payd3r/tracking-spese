import crypto from 'crypto';
import pool from '../config/database.js';
import {
  startAuthorization,
  authorizeSession,
  deleteSession as deleteEbSession,
  listAspsps,
} from '../services/enableBanking/client.js';
import { resolveLocalAccountId } from '../services/enableBanking/parser.js';
import { syncBankingTransactions } from '../services/enableBanking/syncService.js';

const DEFAULT_BANKS = [
  { name: 'Revolut', country: 'LT', label: 'Revolut' },
  { name: 'FinecoBank', country: 'IT', label: 'Fineco' },
  { name: 'PayPal', country: 'IT', label: 'PayPal' },
];

function getRedirectUrl() {
  return (
    process.env.ENABLE_BANKING_REDIRECT_URL ||
    'https://spese.andrea-mauri.duckdns.org/banking/callback'
  );
}

function computeValidUntil(days = 170) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().replace(/\.\d{3}Z$/, '.000000Z');
}

export async function getBankingStatus(req, res, next) {
  try {
    const sessions = await pool.query(
      `SELECT bs.id, bs.session_id, bs.aspsp_name, bs.aspsp_country, bs.valid_until,
              bs.status, bs.last_sync_at, bs.last_sync_error, bs.created_at,
              COALESCE(json_agg(
                json_build_object(
                  'id', bal.id,
                  'accountUid', bal.account_uid,
                  'iban', bal.iban,
                  'currency', bal.currency,
                  'accountName', bal.account_name,
                  'localAccountId', bal.local_account_id
                )
              ) FILTER (WHERE bal.id IS NOT NULL), '[]') AS accounts
       FROM banking_sessions bs
       LEFT JOIN banking_account_links bal ON bal.banking_session_id = bs.id
       WHERE bs.user_id = $1
       GROUP BY bs.id
       ORDER BY bs.created_at DESC`,
      [req.user.id]
    );

    res.json({
      redirectUrl: getRedirectUrl(),
      suggestedBanks: DEFAULT_BANKS,
      sessions: sessions.rows.map((row) => ({
        ...row,
        accounts: typeof row.accounts === 'string' ? JSON.parse(row.accounts) : row.accounts,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function listAvailableAspsps(req, res, next) {
  try {
    const country = req.query.country || undefined;
    const data = await listAspsps({ country, psuType: 'personal' });
    const aspsps = data.aspsps || data || [];
    res.json({ aspsps });
  } catch (error) {
    next(error);
  }
}

export async function startBankingAuth(req, res, next) {
  try {
    const { aspspName, country } = req.body;
    if (!aspspName || !country) {
      return res.status(400).json({ error: 'aspspName e country sono obbligatori' });
    }

    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await pool.query(
      `INSERT INTO banking_auth_states (state, user_id, aspsp_name, aspsp_country, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [state, req.user.id, aspspName, country, expiresAt.toISOString()]
    );

    const auth = await startAuthorization({
      aspspName,
      aspspCountry: country,
      state,
      redirectUrl: getRedirectUrl(),
      validUntil: computeValidUntil(170),
      psuType: 'personal',
    });

    res.json({
      url: auth.url,
      authorizationId: auth.authorization_id,
      state,
    });
  } catch (error) {
    console.error('startBankingAuth error:', error.data || error.message);
    next(error);
  }
}

export async function exchangeBankingCode(req, res, next) {
  const client = await pool.connect();
  try {
    const { code, state } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'code obbligatorio' });
    }

    let authState = null;
    if (state) {
      const stateResult = await client.query(
        `SELECT * FROM banking_auth_states
         WHERE state = $1 AND user_id = $2 AND expires_at > NOW()`,
        [state, req.user.id]
      );
      authState = stateResult.rows[0] || null;
      if (!authState) {
        return res.status(400).json({ error: 'state non valido o scaduto' });
      }
    }

    const sessionData = await authorizeSession(code);

    await client.query('BEGIN');

    if (state) {
      await client.query('DELETE FROM banking_auth_states WHERE state = $1', [state]);
    }

    // Deactivate previous sessions for same ASPSP
    const aspspName = sessionData.aspsp?.name || authState?.aspsp_name || 'Unknown';
    const aspspCountry = sessionData.aspsp?.country || authState?.aspsp_country || 'XX';

    await client.query(
      `UPDATE banking_sessions SET status = 'replaced', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND aspsp_name = $2 AND status = 'active'`,
      [req.user.id, aspspName]
    );

    const sessionInsert = await client.query(
      `INSERT INTO banking_sessions
         (user_id, session_id, aspsp_name, aspsp_country, valid_until, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [
        req.user.id,
        sessionData.session_id,
        aspspName,
        aspspCountry,
        sessionData.access?.valid_until || null,
      ]
    );

    const bankingSession = sessionInsert.rows[0];
    const linkedAccounts = [];

    for (const account of sessionData.accounts || []) {
      const localAccountId = resolveLocalAccountId(aspspName, account.name);
      const iban = account.account_id?.iban || null;
      const insert = await client.query(
        `INSERT INTO banking_account_links
           (banking_session_id, account_uid, identification_hash, iban, currency, account_name, local_account_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (account_uid) DO UPDATE SET
           banking_session_id = EXCLUDED.banking_session_id,
           identification_hash = EXCLUDED.identification_hash,
           iban = EXCLUDED.iban,
           currency = EXCLUDED.currency,
           account_name = EXCLUDED.account_name,
           local_account_id = COALESCE(EXCLUDED.local_account_id, banking_account_links.local_account_id),
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          bankingSession.id,
          account.uid,
          account.identification_hash || null,
          iban,
          account.currency || null,
          account.name || null,
          localAccountId,
        ]
      );
      linkedAccounts.push(insert.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      session: bankingSession,
      accounts: linkedAccounts,
      message: 'Banca collegata con successo',
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('exchangeBankingCode error:', error.data || error.message);
    next(error);
  } finally {
    client.release();
  }
}

export async function syncBankingNow(req, res, next) {
  try {
    // Default: solo oggi. createNew=true crea solo da oggi; linkExisting solo se richiesto
    // (o automaticamente quando createNew=false = solo associa storico).
    const lookbackDays =
      req.body?.lookbackDays !== undefined ? Number(req.body.lookbackDays) : 0;
    const createNew = req.body?.createNew !== false;
    const linkExisting =
      req.body?.linkExisting === true || createNew === false;
    const summary = await syncBankingTransactions({
      userId: req.user.id,
      lookbackDays,
      sendPush: req.body?.sendPush !== false && createNew,
      createNew,
      linkExisting,
    });
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

export async function deleteBankingSession(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `SELECT * FROM banking_sessions WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    const session = result.rows[0];
    try {
      await deleteEbSession(session.session_id);
    } catch (err) {
      console.warn('Delete EB session failed (continuing locally):', err.message);
    }

    await pool.query(
      `UPDATE banking_sessions SET status = 'revoked', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Sessione revocata' });
  } catch (error) {
    next(error);
  }
}
