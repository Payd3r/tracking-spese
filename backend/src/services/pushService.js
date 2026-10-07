import webpush from 'web-push';
import pool from '../config/database.js';

let configured = false;

function ensureVapid() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:andreamauri2013@gmail.com';
  if (!publicKey || !privateKey) {
    console.warn('⚠️  VAPID keys non configurate: push disabilitate');
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function saveSubscription(userId, subscription, userAgent = null) {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Subscription push non valida');
  }

  const result = await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = COALESCE(EXCLUDED.user_agent, push_subscriptions.user_agent),
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, endpoint, created_at`,
    [userId, endpoint, keys.p256dh, keys.auth, userAgent]
  );

  return result.rows[0];
}

export async function removeSubscription(userId, endpoint) {
  await pool.query(
    'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
    [userId, endpoint]
  );
}

export async function listSubscriptions(userId) {
  const result = await pool.query(
    'SELECT id, endpoint, created_at FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  return result.rows;
}

export async function notifyUser(userId, payload) {
  if (!ensureVapid()) return { sent: 0, failed: 0 };

  const result = await pool.query(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  for (const row of result.rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: 60 * 60 * 12, urgency: 'normal' }
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode = error.statusCode || error.status;
      if (statusCode === 404 || statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [row.id]);
      } else {
        console.error('Push notification failed:', statusCode, error.message);
      }
    }
  }

  return { sent, failed };
}

export async function notifyNewBankingTransaction(userId, transaction) {
  const amount = Number(transaction.amount).toFixed(2);
  const sign = transaction.type === 'expense' ? '-' : '+';
  const title = transaction.type === 'expense' ? 'Nuova uscita' : 'Nuova entrata';
  const body = `${sign}€${amount} · ${transaction.title}`;

  return notifyUser(userId, {
    title,
    body,
    url: `/?tx=${transaction.id}`,
    transactionId: transaction.id,
  });
}
