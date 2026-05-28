import { db } from './db';
import { api } from './api';
import { Category, DashboardStats, Transaction } from '@/types/api';
import { getClerkUserId } from './clerkToken';

export interface CachePreloadResult {
  success: boolean;
  categories: number;
  accounts: number;
  transactions: number;
  loans: number;
  repayments: number;
  error?: string;
}

/**
 * Snapshot locale per avvio istantaneo della PWA
 * Contiene i dati necessari per mostrare subito la Home senza attendere il fetch
 */
export interface StartupSnapshot {
  // Dati delle stats per la Home
  stats: DashboardStats | null;
  // Ultime transazioni visualizzate (quelle mostrate nella Home)
  recentTransactions: Transaction[];
  // Periodo e viewType corrente
  period: 'day' | 'week' | 'month' | 'year';
  viewType: 'income' | 'spending';
  // Timestamp ultimo aggiornamento
  lastUpdatedAt: string;
  // Nome utente
  userName?: string;
}

export function isCountedTransaction(transaction: Pick<Transaction, 'categoryExcludeFromTotals' | 'categoryName'>): boolean {
  if (transaction.categoryExcludeFromTotals === true) {
    return false;
  }

  return transaction.categoryName !== 'Trasferimento'
    && transaction.categoryName !== 'Prestito'
    && transaction.categoryName !== 'Restituzione prestito';
}

export function isVisibleTransactionCategory(category: Pick<Category, 'excludeFromTotals' | 'name'>): boolean {
  return category.excludeFromTotals !== true
    && category.name !== 'Trasferimento'
    && category.name !== 'Prestito'
    && category.name !== 'Restituzione prestito';
}

export function sortCategoriesByUsage<T extends Pick<Category, 'name' | 'isSystem' | 'usageCount'>>(categories: T[]): T[] {
  return [...categories].sort((a, b) => {
    const usageDiff = (b.usageCount || 0) - (a.usageCount || 0);
    if (usageDiff !== 0) return usageDiff;
    if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Preload all essential data for offline use
 * Called once when user first logs in or when online
 */
export async function preloadCache(): Promise<CachePreloadResult> {
  try {
    const userId = await getClerkUserId();
    if (!userId) {
      return { success: false, categories: 0, accounts: 0, transactions: 0, loans: 0, repayments: 0, error: 'No user found' };
    }

    // Load categories (both income and expense)
    const [incomeCategories, expenseCategories] = await Promise.all([
      api.categories.getAll('income'),
      api.categories.getAll('expense')
    ]);

    const allCategories = [
      ...(incomeCategories.data.categories || []),
      ...(expenseCategories.data.categories || [])
    ];

    // Load accounts
    const accountsResponse = await api.accounts.getAll();
    const accounts = accountsResponse.data.accounts || [];

    // Load recent transactions (last 100)
    const transactionsResponse = await api.transactions.getAll({
      limit: 100,
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // Last 90 days
    });
    const transactions = transactionsResponse.data.transactions || [];

    // Load all active & closed loans to ensure offline access
    let loansToCache: any[] = [];
    let repaymentsToCache: any[] = [];

    try {
      const loansResponse = await api.loans.getAll();
      const allLoans = loansResponse.data.loans || [];

      // Fetch repayments for each loan in parallel
      const loansDetails = await Promise.all(
        allLoans.map(async (loan: any) => {
          try {
            const detailResponse = await api.loans.getOne(loan.id);
            return detailResponse.data;
          } catch (err) {
            console.warn(`Failed to fetch details for loan ${loan.id}:`, err);
            return { ...loan, repayments: [] };
          }
        })
      );

      repaymentsToCache = loansDetails.flatMap((detail: any) => detail.repayments || []);
      loansToCache = loansDetails.map((detail: any) => {
        const { repayments, ...loanInfo } = detail;
        return { ...loanInfo, userId };
      });
    } catch (loanError) {
      console.error('Failed to preload loans cache:', loanError);
    }

    // Save to cache
    await Promise.all([
      db.cachedCategories.bulkPut(allCategories),
      db.cachedAccounts.bulkPut(accounts),
      db.cachedTransactions.bulkPut(transactions.map(tx => ({ ...tx, userId }))),
      loansToCache.length > 0 ? db.cachedLoans.bulkPut(loansToCache) : Promise.resolve(),
      repaymentsToCache.length > 0 ? db.cachedLoanRepayments.bulkPut(repaymentsToCache) : Promise.resolve(),
      db.metadata.put({ key: 'loansPreloaded', value: 'true' })
    ]);

    return {
      success: true,
      categories: allCategories.length,
      accounts: accounts.length,
      transactions: transactions.length,
      loans: loansToCache.length,
      repayments: repaymentsToCache.length
    };
  } catch (error: any) {
    console.error('Cache preload failed:', error);
    return {
      success: false,
      categories: 0,
      accounts: 0,
      transactions: 0,
      loans: 0,
      repayments: 0,
      error: error.message
    };
  }
}

/**
 * Check if cache has essential data for offline use
 */
export async function hasCacheData(): Promise<boolean> {
  try {
    const [categoriesCount, accountsCount, transactionsCount, loansPreloaded] = await Promise.all([
      db.cachedCategories.count(),
      db.cachedAccounts.count(),
      db.cachedTransactions.count(),
      db.metadata.get('loansPreloaded')
    ]);

    return categoriesCount > 0 && accountsCount > 0 && transactionsCount > 0 && !!loansPreloaded;
  } catch (error) {
    console.error('Error checking cache data:', error);
    return false;
  }
}

/**
 * Get cached categories by type
 */
export async function getCachedCategories(type: 'income' | 'expense') {
  const categories = await db.cachedCategories
    .where('type')
    .equals(type)
    .toArray();

  return sortCategoriesByUsage(categories);
}

/**
 * Get cached accounts
 */
export async function getCachedAccounts() {
  return await db.cachedAccounts.toArray();
}

/**
 * Get cached transactions with optional filters
 */
export async function getCachedTransactions(filters?: {
  type?: 'income' | 'expense';
  limit?: number;
  accountId?: number;
  categoryId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  // Get all transactions first, then filter and sort in memory
  let transactions = await db.cachedTransactions.toArray();

  // Apply filters
  if (filters?.type) {
    transactions = transactions.filter(tx => tx.type === filters.type);
  }

  if (filters?.accountId) {
    transactions = transactions.filter(tx => tx.accountId === filters.accountId);
  }

  if (filters?.categoryId) {
    transactions = transactions.filter(tx => tx.categoryId === filters.categoryId);
  }

  // Apply date filters
  if (filters?.startDate) {
    const startDate = new Date(filters.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    if (filters?.endDate) {
      // Range filter: >= startDate AND <= endDate
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      transactions = transactions.filter(tx => {
        const txDate = new Date(tx.transactionDate);
        return txDate >= startDate && txDate <= endDate;
      });
    } else {
      // Single date filter: >= startDate AND < startDate + 1 day
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      transactions = transactions.filter(tx => {
        const txDate = new Date(tx.transactionDate);
        return txDate >= startDate && txDate < nextDay;
      });
    }
  }

  // Apply search filter (case-insensitive, partial match)
  if (filters?.search) {
    const searchTerm = filters.search.toLowerCase();
    transactions = transactions.filter(tx => {
      const titleMatch = tx.title?.toLowerCase().includes(searchTerm) || false;
      const noteMatch = (tx.note || '').toLowerCase().includes(searchTerm);
      return titleMatch || noteMatch;
    });
  }

  // Sort by transactionDate descending (newest first)
  transactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  // Apply limit
  if (filters?.limit) {
    transactions = transactions.slice(0, filters.limit);
  }

  return transactions;
}

/**
 * Clear all cached data (useful for logout)
 */
export async function clearCache(): Promise<void> {
  await Promise.all([
    db.cachedCategories.clear(),
    db.cachedAccounts.clear(),
    db.cachedTransactions.clear(),
    db.pendingTransactions.clear(),
    db.pendingUpdates.clear(),
    db.pendingDeletes.clear()
  ]);
}

/**
 * Update cache after successful sync
 */
export async function refreshCacheAfterSync(): Promise<void> {
  try {
    // Reload essential data after sync
    const result = await preloadCache();
    if (result.success) {
      console.log('Cache refreshed after sync:', result);
    }
  } catch (error) {
    console.error('Failed to refresh cache after sync:', error);
  }
}

/**
 * Salva lo snapshot locale per l'avvio istantaneo
 * Usa localStorage per lettura sincrona all'avvio
 */
export function setStartupSnapshot(snapshot: StartupSnapshot): void {
  try {
    const serialized = JSON.stringify(snapshot);
    localStorage.setItem('startupSnapshot', serialized);
  } catch (error) {
    console.error('Failed to save startup snapshot:', error);
  }
}

/**
 * Carica lo snapshot locale per l'avvio istantaneo
 * Ritorna null se non esiste o è invalido
 */
export function getStartupSnapshot(): StartupSnapshot | null {
  try {
    const serialized = localStorage.getItem('startupSnapshot');
    if (!serialized) {
      return null;
    }
    
    const snapshot = JSON.parse(serialized) as StartupSnapshot;
    
    // Validazione base dello snapshot
    if (!snapshot.lastUpdatedAt || !snapshot.period || !snapshot.viewType) {
      console.warn('Invalid startup snapshot format');
      return null;
    }
    
    return snapshot;
  } catch (error) {
    console.error('Failed to load startup snapshot:', error);
    return null;
  }
}

/**
 * Rimuove lo snapshot locale
 */
export function clearStartupSnapshot(): void {
  try {
    localStorage.removeItem('startupSnapshot');
  } catch (error) {
    console.error('Failed to clear startup snapshot:', error);
  }
}
