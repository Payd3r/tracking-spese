import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 - unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Type-safe API methods
export const api = {
  // Auth
  auth: {
    register: (data: { email: string; password: string; name?: string; defaultCurrency?: string }) =>
      apiClient.post('/auth/register', data),
    login: (data: { email: string; password: string }) =>
      apiClient.post('/auth/login', data),
    logout: () =>
      apiClient.post('/auth/logout'),
    me: () =>
      apiClient.get('/auth/me'),
  },
  
  // Accounts
  accounts: {
    getAll: () =>
      apiClient.get('/accounts'),
    getOne: (id: number) =>
      apiClient.get(`/accounts/${id}`),
    create: (data: { name: string; icon?: string; currency: string }) =>
      apiClient.post('/accounts', data),
    update: (id: number, data: { name?: string; icon?: string; currency?: string }) =>
      apiClient.put(`/accounts/${id}`, data),
    delete: (id: number) =>
      apiClient.delete(`/accounts/${id}`),
  },
  
  // Categories
  categories: {
    getAll: (type?: 'income' | 'expense') =>
      apiClient.get('/categories', { params: { type } }),
    create: (data: { name: string; icon?: string; color?: string; type: 'income' | 'expense' }) =>
      apiClient.post('/categories', data),
    update: (id: number, data: { name?: string; icon?: string; color?: string }) =>
      apiClient.put(`/categories/${id}`, data),
    delete: (id: number) =>
      apiClient.delete(`/categories/${id}`),
  },
  
  // Transactions
  transactions: {
    getAll: (params?: {
      accountId?: number;
      categoryId?: number;
      type?: 'income' | 'expense';
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }) =>
      apiClient.get('/transactions', { params }),
    getOne: (id: number) =>
      apiClient.get(`/transactions/${id}`),
    create: (data: {
      accountId: number;
      categoryId: number;
      amount: number;
      currency?: string;
      type: 'income' | 'expense';
      title: string;
      note?: string;
      transactionDate: string;
    }) =>
      apiClient.post('/transactions', data),
    update: (id: number, data: Partial<{
      accountId: number;
      categoryId: number;
      amount: number;
      currency?: string;
      type: 'income' | 'expense';
      title: string;
      note?: string;
      transactionDate: string;
    }>) =>
      apiClient.put(`/transactions/${id}`, data),
    delete: (id: number) =>
      apiClient.delete(`/transactions/${id}`),
  },
  
  // Transfers
  transfers: {
    getAll: (params?: { limit?: number; offset?: number }) =>
      apiClient.get('/transfers', { params }),
    getOne: (id: number) =>
      apiClient.get(`/transfers/${id}`),
    create: (data: {
      fromAccountId: number;
      toAccountId: number;
      amount: number;
      transferDate: string;
      note?: string;
    }) =>
      apiClient.post('/transfers', data),
    delete: (id: number) =>
      apiClient.delete(`/transfers/${id}`),
  },
  
  // Stats
  stats: {
    getDashboard: (period?: 'day' | 'week' | 'month' | 'year') =>
      apiClient.get('/stats/dashboard', { params: { period } }),
  },
  
  // Currencies
  currencies: {
    getAll: () =>
      apiClient.get('/currencies'),
    convert: (amount: number, from: string, to: string) =>
      apiClient.get('/currencies/convert', { params: { amount, from, to } }),
  },
};

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}


