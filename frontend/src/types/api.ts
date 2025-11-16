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
  // Pending flag for offline transactions
  isPending?: boolean;
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

// Loan types
export interface Loan {
  id: number;
  userId: string;
  title: string;
  amount: number;
  currency: string;
  fromAccountId: number;
  categoryId: number;
  loanDate: string;
  status: 'active' | 'closed';
  note?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  fromAccountName?: string;
  fromAccountCurrency?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  totalRepaid?: number;
}

export interface LoanRepayment {
  id: number;
  loanId: number;
  amount: number;
  currency: string;
  toAccountId: number;
  repaymentDate: string;
  description?: string;
  createdAt: string;
  // Joined data
  toAccountName?: string;
  toAccountCurrency?: string;
}

export interface LoanDetail extends Loan {
  repayments: LoanRepayment[];
  totalRepaid: number;
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

// Transaction list response
export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
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

