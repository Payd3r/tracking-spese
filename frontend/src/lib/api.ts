import axios, { AxiosError } from 'axios';
import { getClerkToken } from './clerkToken';

// Use relative path for API calls - works in both dev and prod
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Global flag to track server reachability
let serverReachable = true;

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // Reduced from 10000 to fail faster
});

// Request interceptor to add Clerk auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getClerkToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Server is reachable if we get a response
    serverReachable = true;
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 - unauthorized
    if (error.response?.status === 401) {
      (window as any).Clerk?.signOut?.({ redirectUrl: '/auth' });
    }
    
    // Check for network/connection errors
    if (isNetworkError(error)) {
      serverReachable = false;
    }
    
    return Promise.reject(error);
  }
);

// Type-safe API methods
export const api = {
  // Auth
  auth: {
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
      search?: string;
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
      clientRequestId?: string;
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
  
  // Loans
  loans: {
    getAll: (params?: { status?: 'active' | 'closed' }) =>
      apiClient.get('/loans', { params }),
    getOne: (id: number) =>
      apiClient.get(`/loans/${id}`),
    create: (data: {
      title: string;
      amount: number;
      currency: string;
      fromAccountId: number;
      categoryId: number;
      loanDate: string;
      note?: string;
      clientRequestId?: string;
    }) =>
      apiClient.post('/loans', data),
    addRepayment: (id: number, data: {
      amount: number;
      currency: string;
      toAccountId: number;
      repaymentDate: string;
      description?: string;
      clientRequestId?: string;
    }) =>
      apiClient.post(`/loans/${id}/repayments`, data),
    close: (id: number, data?: { clientRequestId?: string }) =>
      apiClient.post(`/loans/${id}/close`, data),
    delete: (id: number) =>
      apiClient.delete(`/loans/${id}`),
  },
};

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Check if server is reachable
export function isServerReachable(): boolean {
  return serverReachable;
}

// Check if we have both internet and server connectivity
export function isFullyOnline(): boolean {
  return isOnline() && isServerReachable();
}

// Health check function to verify server reachability
export async function checkServerHealth(): Promise<boolean> {
  if (!isOnline()) {
    serverReachable = false;
    return false;
  }

  try {
    // Use a lightweight endpoint to check server health
    await apiClient.get('/auth/me', {
      timeout: 3000,
      validateStatus: (status) => status < 500, // Accept 4xx as "server is reachable"
    });
    serverReachable = true;
    return true;
  } catch (error: any) {
    if (isNetworkError(error)) {
      serverReachable = false;
    } else {
      // Server responded (even with error), so it's reachable
      serverReachable = true;
    }
    return serverReachable;
  }
}

// Helper function to detect network errors
function isNetworkError(error: AxiosError): boolean {
  // No response means network error
  if (!error.response) {
    return true;
  }
  
  // Check for specific network error codes
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


