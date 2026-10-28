import test from 'node:test';
import assert from 'node:assert/strict';
import { findPayPalPairs } from '../src/services/enableBanking/paypalReconciliation.js';
const payment = { id: 1, account_name: 'PayPal', source: 'banking', type: 'expense', amount: '1.49', currency: 'EUR', title: 'MuseScore', transaction_date: '2026-10-13', user_id: 'user' };
const card = { ...payment, id: 2, account_name: 'Revolut', title: 'Paypal *musescore', transaction_date: '2026-10-16' };

test('matches PayPal to a funding card, even with delayed booking and formatted merchant', () => {
  assert.equal(findPayPalPairs([payment, card]).pairs.length, 1);
  assert.equal(findPayPalPairs([card, payment]).pairs.length, 1);
  assert.equal(findPayPalPairs([payment, { ...card, account_name: 'Fineco', title: 'PAGAMENTO PAYPAL *MUSESCORE Carta N. *** Data operazione 13/10/26' }]).pairs.length, 1);
});

test('equal amounts alone never merge unrelated payments', () => {
  for (const changed of [
    { title: 'Supermarket' }, { title: 'Paypal *othermerchant' }, { title: 'Paypal *musescoreother' },
    { amount: '1.46' }, { currency: 'USD' }, { user_id: 'other-user' },
    { transaction_date: '2026-10-21' }, { type: 'income' }, { has_paypal_source: true },
  ]) assert.equal(findPayPalPairs([payment, { ...card, ...changed }]).pairs.length, 0, JSON.stringify(changed));
  assert.equal(findPayPalPairs([{ ...payment, source: 'manual' }, card]).pairs.length, 0);
});

test('several payments of the same amount are ambiguous in either direction', () => {
  const twoCards = findPayPalPairs([payment, card, { ...card, id: 3, account_name: 'Fineco' }]);
  assert.equal(twoCards.pairs.length, 0);
  assert.equal(twoCards.ambiguous.length, 1);
  const twoPayments = findPayPalPairs([payment, { ...payment, id: 4 }, card]);
  assert.equal(twoPayments.pairs.length, 0);
  assert.equal(twoPayments.ambiguous.length, 2);
});
