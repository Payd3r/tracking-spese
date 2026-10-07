import pool from '../../config/database.js';
import { fetchAllTransactions } from './client.js';
import { getAltroCategoryIds, parseBankingTransaction } from './parser.js';
import { notifyNewBankingTransaction } from '../pushService.js';

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s.slice(0, 10);
}

function todayIsoRome() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function daysAgoIsoRome(days) {
  // days=0 → oggi (Europe/Rome)
  const parts = todayIsoRome().split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function findExistingByReference(client, accountUid, entryReference) {
  if (!entryReference) return null;
  const result = await client.query(
    `SELECT id FROM transactions
     WHERE banking_account_uid = $1 AND banking_entry_reference = $2
     LIMIT 1`,
    [accountUid, entryReference]
  );
  return result.rows[0] || null;
}

async function insertBankingTransaction(client, userId, parsed) {
  const result = await client.query(
    `INSERT INTO transactions (
       user_id, account_id, category_id, amount, type, title, note,
       transaction_date, source, banking_entry_reference, banking_account_uid
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'banking',$9,$10)
     RETURNING id, title, amount, type, account_id, transaction_date`,
    [
      userId,
      parsed.localAccountId,
      parsed.categoryId,
      parsed.amount,
      parsed.type,
      parsed.title,
      parsed.note,
      parsed.transactionDate,
      parsed.entryReference,
      parsed.accountUid,
    ]
  );
  return result.rows[0];
}

/**
 * Sync banking transactions.
 * Default: solo da oggi (Europe/Rome), crea nuove tx, nessuna associazione allo storico locale.
 */
export async function syncBankingTransactions({
  userId = null,
  lookbackDays = 0,
  dateFrom = null,
  dateTo = null,
  sendPush = true,
  createNew = true,
  linkExisting = false,
  strategy = 'default',
} = {}) {
  const client = await pool.connect();
  const summary = {
    sessions: 0,
    accounts: 0,
    fetched: 0,
    created: 0,
    linked: 0,
    skipped: 0,
    errors: [],
    createdTransactions: [],
    dateFrom: null,
    dateTo: null,
  };

  try {
    const sessionParams = [];
    let sessionSql = `
      SELECT bs.*, bal.id AS link_id, bal.account_uid, bal.local_account_id,
             bal.identification_hash, bal.account_name, bal.currency AS link_currency
      FROM banking_sessions bs
      JOIN banking_account_links bal ON bal.banking_session_id = bs.id
      WHERE bs.status = 'active'
        AND bal.local_account_id IS NOT NULL
    `;
    if (userId) {
      sessionParams.push(userId);
      sessionSql += ` AND bs.user_id = $${sessionParams.length}`;
    }
    sessionSql += ' ORDER BY bs.id, bal.id';

    const linksResult = await client.query(sessionSql, sessionParams);
    if (linksResult.rows.length === 0) {
      return { ...summary, message: 'Nessun conto bancario collegato' };
    }

    const bySession = new Map();
    for (const row of linksResult.rows) {
      if (!bySession.has(row.id)) {
        bySession.set(row.id, { session: row, links: [] });
        summary.sessions += 1;
      }
      bySession.get(row.id).links.push(row);
    }

    const from = dateFrom || daysAgoIsoRome(lookbackDays);
    const to = dateTo || todayIsoRome();
    summary.dateFrom = from;
    summary.dateTo = to;

    for (const { session, links } of bySession.values()) {
      const categoryIds = await getAltroCategoryIds(client, session.user_id);
      let sessionError = null;

      for (const link of links) {
        summary.accounts += 1;
        try {
          const rawTransactions = await fetchAllTransactions(link.account_uid, {
            dateFrom: from,
            dateTo: to,
            transactionStatus: 'BOOK',
            strategy,
          });
          summary.fetched += rawTransactions.length;

          for (const raw of rawTransactions) {
            const parsed = parseBankingTransaction(raw, {
              localAccountId: link.local_account_id,
              accountUid: link.account_uid,
              categoryIds,
            });
            if (!parsed) {
              summary.skipped += 1;
              continue;
            }

            const txDate = toDateOnly(parsed.transactionDate);
            if (txDate && txDate < from) {
              summary.skipped += 1;
              continue;
            }

            await client.query('BEGIN');
            try {
              const byRef = await findExistingByReference(
                client,
                link.account_uid,
                parsed.entryReference
              );
              if (byRef) {
                summary.skipped += 1;
                await client.query('COMMIT');
                continue;
              }

              // Associazione fingerprint (importo+segno+data±2) se richiesta
              if (linkExisting) {
                const date = toDateOnly(parsed.transactionDate);
                const fp = await client.query(
                  `SELECT id FROM transactions
                   WHERE user_id = $1
                     AND account_id = $2
                     AND type = $3
                     AND amount = $4
                     AND DATE(transaction_date) BETWEEN ($5::date - INTERVAL '2 day') AND ($5::date + INTERVAL '2 day')
                     AND banking_entry_reference IS NULL
                   ORDER BY ABS(EXTRACT(EPOCH FROM (transaction_date - $5::timestamp)))
                   LIMIT 2`,
                  [session.user_id, link.local_account_id, parsed.type, parsed.amount, date]
                );
                if (fp.rows.length === 1) {
                  await client.query(
                    `UPDATE transactions SET
                       banking_entry_reference = COALESCE(banking_entry_reference, $2),
                       banking_account_uid = COALESCE(banking_account_uid, $3),
                       updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [fp.rows[0].id, parsed.entryReference, parsed.accountUid]
                  );
                  summary.linked += 1;
                  await client.query('COMMIT');
                  continue;
                }
              }

              if (!createNew) {
                summary.skipped += 1;
                await client.query('COMMIT');
                continue;
              }

              // Crea solo movimenti da oggi in poi (Europe/Rome)
              const today = todayIsoRome();
              if (txDate && txDate < today) {
                summary.skipped += 1;
                await client.query('COMMIT');
                continue;
              }

              const created = await insertBankingTransaction(client, session.user_id, parsed);
              summary.created += 1;
              summary.createdTransactions.push(created);
              await client.query('COMMIT');

              if (sendPush) {
                try {
                  await notifyNewBankingTransaction(session.user_id, created);
                } catch (pushErr) {
                  console.error('Push after banking insert failed:', pushErr.message);
                }
              }
            } catch (txErr) {
              await client.query('ROLLBACK');
              if (txErr.code === '23505') {
                summary.skipped += 1;
              } else {
                throw txErr;
              }
            }
          }
        } catch (err) {
          const message = err.code || err.message;
          sessionError = message;
          summary.errors.push({
            sessionId: session.session_id,
            accountUid: link.account_uid,
            aspsp: session.aspsp_name,
            error: message,
            status: err.status,
            data: err.data,
          });
          console.error(
            `Banking sync error ${session.aspsp_name}/${link.account_uid}:`,
            message
          );
          if (err.code === 'ASPSP_RATE_LIMIT_EXCEEDED' || err.status === 429) {
            break;
          }
        }
      }

      await client.query(
        `UPDATE banking_sessions SET
           last_sync_at = CURRENT_TIMESTAMP,
           last_sync_error = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [session.id, sessionError]
      );
    }

    return summary;
  } finally {
    client.release();
  }
}
