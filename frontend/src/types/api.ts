// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

// Account types
export interface Account {
  id: number;
  userId: string;
  name: string;
  icon?: string;
  currency: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

// Category types
export interface Category {
  id: number;
  userId?: string;
  name: string;
  icon?: string;
  color?: string;
  type: 'income' | 'expense';
  isSystem: boolean;
  createdAt: string;
}

// Transaction types
export interface Transaction {
  id: number;
  userId: string;
  accountId: number;
  categoryId: number;
  amount: number;
  originalAmount?: number;
  originalCurrency?: string;
  type: 'income' | 'expense';
  title: string;
  note?: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  accountName?: string;
  accountCurrency?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}

// Transfer types
export interface Transfer {
  id: number;
  userId: string;
  fromAccountId: number;
  toAccountId: number;
  fromAmount: number;
  toAmount: number;
  transferDate: string;
  note?: string;
  createdAt: string;
  // Joined data
  fromAccountName?: string;
  toAccountName?: string;
}

// Dashboard stats types
export interface DashboardStats {
  totalBalance: number;
  currency: string;
  period: {
    name: 'day' | 'week' | 'month' | 'year';
    startDate: string;
    endDate: string;
    totalIncome: number;
    totalExpense: number;
    netIncome: number;
  };
  trend?: Array<{
    date: string;
    income: number;
    expense: number;
  }>;
  recentTransactions?: Transaction[];
  categoryStats?: Array<{
    categoryId: number;
    categoryName: string;
    categoryIcon?: string;
    categoryColor?: string;
    total: number;
    count: number;
  }>;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

