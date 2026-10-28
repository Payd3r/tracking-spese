import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../src/config/database.js';
import { syncBankingTransactions } from '../src/services/enableBanking/syncService.js';

// Exercise the reconciliation with an in-memory database double; no bank requests.
test('recovers late bookings, links manual expenses and remains idempotent', async () => {
  const originalConnect = pool.connect;
  const stored = new Map();
  const manual = { id: 'manual-1' };
  let released = 0;
  const client = {
    release() { released++; },
    async query(sql, args = []) {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql.includes('SELECT bs.*')) return { rows: [{ id: 1, user_id: 'user', account_uid: 'account', local_account_id: 8, aspsp_name: 'Revolut' }] };
      if (sql.includes('FROM categories')) return { rows: [{ id: 1, type: 'income' }, { id: 2, type: 'expense' }] };
      if (sql.includes('WHERE banking_account_uid')) return { rows: stored.has(args[1]) ? [stored.get(args[1])] : [] };
      if (sql.includes('SELECT id FROM transactions') && args[3] === 17) return { rows: [{ id: 'a' }, { id: 'b' }] };
      if (sql.includes('SELECT id FROM transactions')) return { rows: args[3] === 16 && manual.available !== false ? [manual] : [] };
      if (sql.includes('UPDATE transactions SET')) { manual.available = false; stored.set(args[1], manual); }
      if (sql.includes('INSERT INTO transactions')) {
        const row = { id: `bank-${stored.size}`, amount: args[3], transaction_date: args[7] };
        stored.set(args[8], row);
        return { rows: [row] };
      }
      return { rows: [] };
    },
  };
  pool.connect = async () => client;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  const yesterday = new Date(`${today}T00:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const date = yesterday.toISOString().slice(0, 10);
  const raw = (ref, amount) => ({ entry_reference: ref, booking_date: date, transaction_amount: { amount }, credit_debit_indicator: 'DBIT', remittance_information: ['Test expense'] });
  const fetchTransactions = async () => [raw('late', '150'), raw('manual', '16'), raw(null, '2'), raw(null, '2'), raw('zero', '0'), raw('ambiguous', '17')];
  try {
    const first = await syncBankingTransactions({ fetchTransactions, sendPush: false });
    assert.equal(first.created, 3);
    assert.equal(first.linked, 1);
    assert.equal(first.skipped, 2);
    assert.equal(first.errors[0].error, 'AMBIGUOUS_LOCAL_MATCH');
    assert.equal(first.createdTransactions[0].transaction_date, date);
    const second = await syncBankingTransactions({ fetchTransactions, sendPush: false });
    assert.equal(second.created, 0);
    assert.equal(second.linked, 0);
    assert.equal(second.skipped, 6);
    assert.equal(stored.size, 4);
    assert.equal(released, 2);
  } finally { pool.connect = originalConnect; }
});

test('a concurrent sync does not fetch or write transactions', async () => {
  const originalConnect = pool.connect;
  let released = false;
  pool.connect = async () => ({ query: async () => ({ rows: [{ locked: false }] }), release() { released = true; } });
  try {
    const result = await syncBankingTransactions({ fetchTransactions: () => { throw new Error('must not fetch'); } });
    assert.equal(result.reason, 'already_running');
    assert.equal(released, true);
  } finally { pool.connect = originalConnect; }
});
