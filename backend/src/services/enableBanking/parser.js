/** Map Enable Banking ASPSP names to local account ids (Revolut=8, Fineco=9, PayPal=11). */
export function resolveLocalAccountId(aspspName, accountName = '') {
  const haystack = `${aspspName || ''} ${accountName || ''}`.toLowerCase();
  if (haystack.includes('revolut')) return 8;
  if (haystack.includes('fineco')) return 9;
  if (haystack.includes('paypal')) return 11;
  return null;
}

export function parseBankingTransaction(raw, { localAccountId, accountUid, categoryIds }) {
  const indicator = (raw.credit_debit_indicator || '').toUpperCase();
  const type = indicator === 'CRDT' ? 'income' : 'expense';
  const categoryId = type === 'income' ? categoryIds.income : categoryIds.expense;

  const amountRaw = raw.transaction_amount?.amount ?? raw.transaction_amount ?? '0';
  const amount = Math.abs(parseFloat(String(amountRaw).replace(',', '.')));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const remittance = Array.isArray(raw.remittance_information)
    ? raw.remittance_information.filter(Boolean)
    : raw.remittance_information
      ? [String(raw.remittance_information)]
      : [];

  const counterparty =
    type === 'expense'
      ? raw.creditor?.name || raw.creditor_account?.iban
      : raw.debtor?.name || raw.debtor_account?.iban;

  const title =
    remittance[0] ||
    counterparty ||
    raw.reference_number ||
    raw.bank_transaction_code?.description ||
    'Movimento bancario';

  const noteParts = [];
  if (remittance.length) noteParts.push(remittance.join(' | '));
  if (raw.reference_number) noteParts.push(`Ref: ${raw.reference_number}`);
  if (counterparty && !remittance[0]) noteParts.push(String(counterparty));

  const dateStr =
    raw.booking_date ||
    raw.value_date ||
    raw.transaction_date ||
    new Date().toISOString().slice(0, 10);

  const entryReference =
    raw.entry_reference ||
    raw.transaction_id ||
    null;

  return {
    localAccountId,
    accountUid,
    categoryId,
    amount,
    type,
    title: String(title).slice(0, 255),
    note: noteParts.length ? noteParts.join('\n').slice(0, 2000) : null,
    transactionDate: dateStr,
    entryReference: entryReference ? String(entryReference) : null,
    bookingDate: raw.booking_date || null,
    raw,
  };
}

export async function getAltroCategoryIds(poolOrClient, userId) {
  const result = await poolOrClient.query(
    `SELECT id, type FROM categories
     WHERE name = 'Altro'
       AND (user_id = $1 OR (user_id IS NULL AND is_system = true) OR user_id IS NULL)
     ORDER BY CASE WHEN user_id = $1 THEN 0 ELSE 1 END, id`,
    [userId]
  );

  const categoryIds = { income: null, expense: null };
  for (const row of result.rows) {
    if (!categoryIds[row.type]) categoryIds[row.type] = row.id;
  }

  if (!categoryIds.income || !categoryIds.expense) {
    throw new Error('Categorie Altro (income/expense) non trovate');
  }

  return categoryIds;
}
