import axios, { AxiosError } from 'axios';
import { getAuthToken, removeAuthToken } from './authStorage';
import { getIsOnline } from '../hooks/useOnlineStatus';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

let serverReachable = true;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    serverReachable = true;
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      removeAuthToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth';
      }
    }
    
    if (isNetworkError(error)) {
      serverReachable = false;
    }
    
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    getStatus: () => apiClient.get('/auth/status'),
    getRegisterOptions: () => apiClient.get('/auth/passkey/register-options'),
    verifyRegister: (body: any) => apiClient.post('/auth/passkey/register-verify', body),
    getLoginOptions: () => apiClient.get('/auth/passkey/login-options'),
    verifyLogin: (body: any) => apiClient.post('/auth/passkey/login-verify', body),
    logout: () => apiClient.post('/auth/logout'),
    me: () => apiClient.get('/auth/me'),
    updateProfile: (data: { name?: string; defaultCurrency?: string }) =>
      apiClient.put('/auth/profile', data),
  },
  
  accounts: {
    getAll: () => apiClient.get('/accounts'),
    getOne: (id: number) => apiClient.get(`/accounts/${id}`),
    create: (data: { name: string; icon?: string; currency: string }) => apiClient.post('/accounts', data),
    update: (id: number, data: { name?: string; icon?: string; currency?: string }) => apiClient.put(`/accounts/${id}`, data),
    delete: (id: number) => apiClient.delete(`/accounts/${id}`),
  },
  
  categories: {
    getAll: (type?: 'income' | 'expense') => apiClient.get('/categories', { params: { type } }),
    create: (data: { name: string; icon?: string; color?: string; type: 'income' | 'expense' }) => apiClient.post('/categories', data),
    update: (id: number, data: { name?: string; icon?: string; color?: string }) => apiClient.put(`/categories/${id}`, data),
    delete: (id: number) => apiClient.delete(`/categories/${id}`),
  },
  
  transactions: {
    getAll: (params?: {
      accountId?: number;
      categoryId?: number;
      type?: 'income' | 'expense';
      startDate?: string;
      endDate?: string;
      search?: string;
      note?: string;
      includeLoans?: boolean;
      limit?: number;
      offset?: number;
    }) => apiClient.get('/transactions', { params }),
    getOne: (id: number) => apiClient.get(`/transactions/${id}`),
    create: (data: {
      accountId: number;
      categoryId: number;
      amount: number;
      currency?: string;
      type: 'income' | 'expense';
      title: string;
      note?: string;
      transactionDate: string;
      clientRequestId?: string;
    }) => apiClient.post('/transactions', data),
    update: (id: number, data: Partial<{
      accountId: number;
      categoryId: number;
      amount: number;
      currency?: string;
      type: 'income' | 'expense';
      title: string;
      note?: string;
      transactionDate: string;
    }>) => apiClient.put(`/transactions/${id}`, data),
    delete: (id: number) => apiClient.delete(`/transactions/${id}`),
  },
  
  stats: {
    getDashboard: (period?: 'day' | 'week' | 'month' | 'year', type?: 'income' | 'expense') =>
      apiClient.get('/stats/dashboard', { params: { period, type } }),
    getCategoryStats: (type?: 'income' | 'expense') =>
      apiClient.get('/stats/categories', { params: { type } }),
  },
  
  currencies: {
    getAll: () => apiClient.get('/currencies'),
    convert: (amount: number, from: string, to: string) =>
      apiClient.get('/currencies/convert', { params: { amount, from, to } }),
  },
  
  loans: {
    getAll: (params?: { status?: 'active' | 'closed' }) => apiClient.get('/loans', { params }),
    getOne: (id: number) => apiClient.get(`/loans/${id}`),
    create: (data: {
      title: string;
      amount: number;
      currency: string;
      fromAccountId: number;
      categoryId: number;
      loanDate: string;
      note?: string;
      clientRequestId?: string;
    }) => apiClient.post('/loans', data),
    addRepayment: (id: number, data: {
      amount: number;
      currency: string;
      toAccountId: number;
      repaymentDate: string;
      description?: string;
      clientRequestId?: string;
    }) => apiClient.post(`/loans/${id}/repayments`, data),
    close: (id: number, data?: { clientRequestId?: string }) => apiClient.post(`/loans/${id}/close`, data),
    delete: (id: number) => apiClient.delete(`/loans/${id}`),
    adminValidate: (data: { username: string; password: string }) =>
      apiClient.post('/loans/admin/validate', data),
    adminConvertFromTransaction: (data: {
      username: string;
      password: string;
      transactionId: number;
      categoryId: number;
      title: string;
      note?: string;
    }) => apiClient.post('/loans/admin/convert-from-transaction', data),
    adminAttachRepaymentTransaction: (id: number, data: {
      username: string;
      password: string;
      transactionId: number;
      description?: string;
    }) => apiClient.post(`/loans/admin/${id}/attach-repayment-transaction`, data),
  },

  banking: {
    getStatus: () => apiClient.get('/banking/status'),
    listAspsps: (country?: string) => apiClient.get('/banking/aspsps', { params: { country } }),
    startAuth: (data: { aspspName: string; country: string }) =>
      apiClient.post('/banking/auth', data),
    exchange: (data: { code: string; state?: string }) =>
      apiClient.post('/banking/exchange', data),
    sync: (data?: {
      lookbackDays?: number;
      sendPush?: boolean;
      createNew?: boolean;
      linkExisting?: boolean;
    }) => apiClient.post('/banking/sync', data || {}),
    deleteSession: (id: number) => apiClient.delete(`/banking/sessions/${id}`),
  },

  push: {
    getVapidPublicKey: () => apiClient.get('/push/vapid-public-key'),
    getStatus: () => apiClient.get('/push/status'),
    subscribe: (subscription: PushSubscriptionJSON) =>
      apiClient.post('/push/subscribe', { subscription }),
    unsubscribe: (endpoint: string) =>
      apiClient.delete('/push/subscribe', { data: { endpoint } }),
  },
};

export function isOnline(): boolean {
  return getIsOnline();
}

export function isServerReachable(): boolean {
  return serverReachable;
}

export function isFullyOnline(): boolean {
  return isOnline() && isServerReachable();
}

export async function checkServerHealth(): Promise<boolean> {
  if (!isOnline()) {
    serverReachable = false;
    return false;
  }

  try {
    await axios.get('/health', {
      timeout: 2000,
      validateStatus: (status) => status === 200,
    });
    serverReachable = true;
    return true;
  } catch (error: any) {
    if (isNetworkError(error)) {
      serverReachable = false;
    } else {
      serverReachable = true;
    }
    return serverReachable;
  }
}

function isNetworkError(error: AxiosError): boolean {
  if (!error.response) {
    return true;
  }
  
  const networkErrorCodes = [
    'ECONNREFUSED',
    'ETIMEDOUT', 
    'ENETUNREACH',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED'
  ];
  
  return networkErrorCodes.includes(error.code || '') || 
         error.message.includes('Network Error') ||
         error.message.includes('timeout');
}
