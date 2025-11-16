import Dexie, { Table } from 'dexie';

export interface PendingTransaction {
  tempId: string;
  userId: string;
  accountId: number;
  categoryId: number;
  amount: number;
  currency?: string;
  type: 'income' | 'expense';
  title: string;
  note?: string;
  transactionDate: string;
  createdAt: string;
  // Metadata for display
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  accountName?: string;
  accountCurrency?: string;
}

export interface PendingUpdate {
  id: string;
  entity: 'transaction' | 'account' | 'category' | 'transfer';
  entityId: number;
  data: any;
  timestamp: string;
}

export interface PendingDelete {
  id: string;
  entity: 'transaction' | 'account' | 'category' | 'transfer';
  entityId: number;
  timestamp: string;
}

export interface CachedAccount {
  id: number;
  userId: string;
  name: string;
  icon?: string;
  currency: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CachedTransaction {
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

export interface CachedCategory {
  id: number;
  userId?: string;
  name: string;
  icon?: string;
  color?: string;
  type: 'income' | 'expense';
  isSystem: boolean;
  createdAt: string;
}

export interface CachedLoan {
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

export interface CachedLoanRepayment {
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

export interface Metadata {
  key: string;
  value: any;
}

export class TrackingSpeseDB extends Dexie {
  pendingTransactions!: Table<PendingTransaction, string>;
  pendingUpdates!: Table<PendingUpdate, string>;
  pendingDeletes!: Table<PendingDelete, string>;
  cachedAccounts!: Table<CachedAccount, number>;
  cachedTransactions!: Table<CachedTransaction, number>;
  cachedCategories!: Table<CachedCategory, number>;
  cachedLoans!: Table<CachedLoan, number>;
  cachedLoanRepayments!: Table<CachedLoanRepayment, number>;
  metadata!: Table<Metadata, string>;

  constructor() {
    super('TrackingSpeseDB');
    
    this.version(1).stores({
      pendingTransactions: 'tempId, userId, createdAt',
      pendingUpdates: 'id, entity, timestamp',
      pendingDeletes: 'id, entity, timestamp',
      cachedAccounts: 'id, userId',
      cachedTransactions: 'id, userId, transactionDate, accountId',
      cachedCategories: 'id, userId, type',
      metadata: 'key'
    });

    this.version(2).stores({
      pendingTransactions: 'tempId, userId, createdAt, type',
      pendingUpdates: 'id, entity, timestamp',
      pendingDeletes: 'id, entity, timestamp',
      cachedAccounts: 'id, userId',
      cachedTransactions: 'id, userId, transactionDate, accountId, type',
      cachedCategories: 'id, userId, type',
      metadata: 'key'
    });

    this.version(3).stores({
      pendingTransactions: 'tempId, userId, createdAt, type',
      pendingUpdates: 'id, entity, timestamp',
      pendingDeletes: 'id, entity, timestamp',
      cachedAccounts: 'id, userId',
      cachedTransactions: 'id, userId, transactionDate, accountId, type',
      cachedCategories: 'id, userId, type',
      cachedLoans: 'id, userId, status, loanDate',
      cachedLoanRepayments: 'id, loanId, repaymentDate',
      metadata: 'key'
    });
  }
}

export const db = new TrackingSpeseDB();

// Helper functions
export async function getLastSyncTime(): Promise<Date | null> {
  const meta = await db.metadata.get('lastSync');
  return meta ? new Date(meta.value) : null;
}

export async function setLastSyncTime(date: Date): Promise<void> {
  await db.metadata.put({ key: 'lastSync', value: date.toISOString() });
}

export async function hasPendingOperations(): Promise<boolean> {
  const [txCount, updateCount, deleteCount] = await Promise.all([
    db.pendingTransactions.count(),
    db.pendingUpdates.count(),
    db.pendingDeletes.count()
  ]);
  
  return txCount > 0 || updateCount > 0 || deleteCount > 0;
}

export async function getPendingCount(): Promise<number> {
  const [txCount, updateCount, deleteCount] = await Promise.all([
    db.pendingTransactions.count(),
    db.pendingUpdates.count(),
    db.pendingDeletes.count()
  ]);
  
  return txCount + updateCount + deleteCount;
}

export async function clearAllCache(): Promise<void> {
  await Promise.all([
    db.cachedAccounts.clear(),
    db.cachedTransactions.clear(),
    db.cachedCategories.clear(),
    db.cachedLoans.clear(),
    db.cachedLoanRepayments.clear()
  ]);
}


