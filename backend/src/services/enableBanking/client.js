import axios from 'axios';
import { createEnableBankingJwt } from './jwt.js';

const DEFAULT_BASE_URL = 'https://api.enablebanking.com';

function getBaseUrl() {
  return (process.env.ENABLE_BANKING_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

async function request(method, pathname, { params, data, headers } = {}) {
  const token = createEnableBankingJwt();
  try {
    const response = await axios({
      method,
      url: `${getBaseUrl()}${pathname}`,
      params,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      timeout: 60000,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      const err = new Error(
        response.data?.message ||
          response.data?.error ||
          `Enable Banking HTTP ${response.status}`
      );
      err.status = response.status;
      err.code = response.data?.error;
      err.data = response.data;
      throw err;
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      const err = new Error(
        error.response.data?.message ||
          error.response.data?.error ||
          `Enable Banking HTTP ${error.response.status}`
      );
      err.status = error.response.status;
      err.code = error.response.data?.error;
      err.data = error.response.data;
      throw err;
    }
    throw error;
  }
}

export async function listAspsps({ country, psuType = 'personal' } = {}) {
  return request('GET', '/aspsps', {
    params: {
      ...(country ? { country } : {}),
      psu_type: psuType,
      service: 'AIS',
    },
  });
}

export async function startAuthorization({
  aspspName,
  aspspCountry,
  state,
  redirectUrl,
  validUntil,
  psuType = 'personal',
}) {
  return request('POST', '/auth', {
    data: {
      access: {
        valid_until: validUntil,
      },
      aspsp: {
        name: aspspName,
        country: aspspCountry,
      },
      state,
      redirect_url: redirectUrl,
      psu_type: psuType,
    },
  });
}

export async function authorizeSession(code) {
  return request('POST', '/sessions', {
    data: { code },
  });
}

export async function getSession(sessionId) {
  return request('GET', `/sessions/${sessionId}`);
}

export async function deleteSession(sessionId) {
  return request('DELETE', `/sessions/${sessionId}`);
}

export async function getAccountTransactions(accountUid, {
  dateFrom,
  dateTo,
  continuationKey,
  transactionStatus = 'BOOK',
  strategy = 'default',
} = {}) {
  return request('GET', `/accounts/${accountUid}/transactions`, {
    params: {
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      ...(continuationKey ? { continuation_key: continuationKey } : {}),
      ...(transactionStatus ? { transaction_status: transactionStatus } : {}),
      strategy,
    },
  });
}

export async function fetchAllTransactions(accountUid, options = {}) {
  const all = [];
  let continuationKey = options.continuationKey || null;
  let page = 0;

  do {
    page += 1;
    const data = await getAccountTransactions(accountUid, {
      ...options,
      continuationKey: continuationKey || undefined,
    });
    const transactions = data.transactions || data || [];
    if (Array.isArray(transactions)) {
      all.push(...transactions);
    } else if (Array.isArray(data.transactions)) {
      all.push(...data.transactions);
    }
    continuationKey = data.continuation_key || null;
    if (page > 100) break;
  } while (continuationKey);

  return all;
}
