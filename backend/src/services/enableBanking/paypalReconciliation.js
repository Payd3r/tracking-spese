function merchantName(value, card = false) {
  let text = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (card) {
    // A card payment must explicitly identify PayPal as intermediary.
    const match = text.match(/\bpaypal\b[\s*.:/-]*(.+)/);
    if (!match) return '';
    text = match[1].split(/\bcarta\b|\bdata operazione\b/)[0];
  }
  return text.replace(/[^a-z0-9]/g, '');
}

function sameMerchant(paypal, card) {
  const merchant = merchantName(paypal.title);
  const description = merchantName(card.title, true);
  if (!merchant || !description) return false;
  return merchant === description || (merchant.length >= 5 && description.startsWith(merchant)
    && ['com', 'it', 'eu'].includes(description.slice(merchant.length)));
}

function dateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

// Mutual uniqueness is required: two equal payments must never collapse into one.
export function findPayPalPairs(rows) {
  const paypal = rows.filter(t => /^paypal$/i.test(t.account_name) && t.source === 'banking' && t.type === 'expense');
  const cards = rows.filter(t => /^(revolut|fineco(?:bank)?)$/i.test(t.account_name)
    && t.type === 'expense' && !t.has_paypal_source);
  const candidates = paypal.map(payment => ({
    payment,
    cards: cards.filter(card => card.user_id === payment.user_id
      && card.currency === payment.currency
      && Math.round(Number(card.amount) * 100) === Math.round(Number(payment.amount) * 100)
      && Math.abs(Date.parse(dateOnly(card.transaction_date)) - Date.parse(dateOnly(payment.transaction_date))) <= 7 * 86400000
      && sameMerchant(payment, card)),
  }));
  const pairs = [];
  const ambiguous = [];
  for (const candidate of candidates) {
    if (!candidate.cards.length) continue;
    if (candidate.cards.length === 1
      && candidates.filter(c => c.cards.some(card => card.id === candidate.cards[0].id)).length === 1) {
      pairs.push({ paypal: candidate.payment, card: candidate.cards[0] });
    } else {
      ambiguous.push({ paypalId: candidate.payment.id, cardIds: candidate.cards.map(c => c.id) });
    }
  }
  return { pairs, ambiguous };
}

export async function reconcilePayPalPayments(client, { userId = null, dateFrom, dateTo }) {
  // Also register new imports and manual expenses linked during this sync.
  await client.query(`INSERT INTO banking_transaction_sources
      (banking_account_uid, banking_entry_reference, transaction_id, account_name, snapshot)
    SELECT t.banking_account_uid, t.banking_entry_reference, t.id, a.name, to_jsonb(t)
    FROM transactions t JOIN accounts a ON a.id = t.account_id
    WHERE t.banking_account_uid IS NOT NULL AND t.banking_entry_reference IS NOT NULL
      AND ($1::uuid IS NULL OR t.user_id = $1)
    ON CONFLICT (banking_account_uid, banking_entry_reference) DO NOTHING`, [userId]);

  const { rows } = await client.query(`SELECT t.*, a.name AS account_name, a.currency,
      EXISTS (SELECT 1 FROM banking_transaction_sources s
        WHERE s.transaction_id = t.id AND lower(s.account_name) = 'paypal') AS has_paypal_source
    FROM transactions t JOIN accounts a ON a.id = t.account_id
    WHERE ($1::uuid IS NULL OR t.user_id = $1)
      AND t.transaction_date::date BETWEEN ($2::date - INTERVAL '7 day') AND $3::date
      AND t.type = 'expense'
    ORDER BY t.id FOR UPDATE OF t`, [userId, dateFrom, dateTo]);
  const { pairs, ambiguous } = findPayPalPairs(rows);
  const merged = [];
  for (const { paypal, card } of pairs) {
    // Preserve the original PayPal row, including its ID, in the source snapshot.
    await client.query(`UPDATE banking_transaction_sources SET transaction_id = $1 WHERE transaction_id = $2`, [card.id, paypal.id]);
    // Keep any category/note assigned by the user to the PayPal expense.
    await client.query(`UPDATE transactions card SET
        category_id = CASE WHEN COALESCE(c.name, 'Altro') = 'Altro' AND pc.name <> 'Altro'
          THEN p.category_id ELSE card.category_id END,
        note = CASE WHEN NULLIF(p.note, '') IS NOT NULL AND p.note IS DISTINCT FROM card.note
          THEN concat_ws(E'\n', NULLIF(card.note, ''), 'PayPal: ' || p.note) ELSE card.note END,
        updated_at = CURRENT_TIMESTAMP
      FROM transactions p
      LEFT JOIN categories pc ON pc.id = p.category_id,
      categories c
      WHERE card.id = $1 AND p.id = $2 AND c.id = card.category_id`, [card.id, paypal.id]);
    await client.query('DELETE FROM transactions WHERE id = $1', [paypal.id]);
    merged.push({ paypalId: paypal.id, transactionId: card.id, account: card.account_name, amount: paypal.amount });
  }
  return { merged, ambiguous };
}
