import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// Use relative path for API calls - works in both dev and prod
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
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
      window.location.href = '/auth';
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
    updateProfile: (data: { name?: string; defaultCurrency?: string }) =>
      apiClient.put('/auth/profile', data),
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
  
  // Stats
  stats: {
    getDashboard: (period?: 'day' | 'week' | 'month' | 'year', type?: 'income' | 'expense') =>
      apiClient.get('/stats/dashboard', { params: { period, type } }),
    getCategoryStats: (type?: 'income' | 'expense') =>
      apiClient.get('/stats/categories', { params: { type } }),
  },
  
  // Currencies
  currencies: {
    getAll: () =>
      apiClient.get('/currencies'),
    convert: (amount: number, from: string, to: string) =>
      apiClient.get('/currencies/convert', { params: { amount, from, to } }),
  },
};

// Server health check
let serverReachable: boolean | null = null;
let lastHealthCheck: number = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export async function checkServerHealth(): Promise<boolean> {
  try {
    // Use a lightweight endpoint for health check
    const response = await apiClient.get('/auth/me', { timeout: 3000 });
    serverReachable = response.status >= 200 && response.status < 400;
    lastHealthCheck = Date.now();
    return serverReachable;
  } catch (error: any) {
    // Check if it's a connection error vs server error
    const isConnectionError = 
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout') ||
      !error.response; // No response means connection issue
    
    serverReachable = !isConnectionError;
    lastHealthCheck = Date.now();
    return serverReachable;
  }
}

export function isServerReachable(): boolean {
  // If we haven't checked recently, assume server is reachable
  if (Date.now() - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
    return true;
  }
  return serverReachable ?? true;
}

// Check if online (both internet and server)
export function isOnline(): boolean {
  return navigator.onLine && isServerReachable();
}


