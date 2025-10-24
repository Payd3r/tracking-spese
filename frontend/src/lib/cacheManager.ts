import { db } from './db';
import { api } from './api';

export interface CachePreloadResult {
  success: boolean;
  categories: number;
  accounts: number;
  transactions: number;
  error?: string;
}

/**
 * Preload all essential data for offline use
 * Called once when user first logs in or when online
 */
export async function preloadCache(): Promise<CachePreloadResult> {
  try {
    const user = localStorage.getItem('user');
    if (!user) {
      return { success: false, categories: 0, accounts: 0, transactions: 0, error: 'No user found' };
    }

    const userId = JSON.parse(user).id;

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

    // Save to cache
    await Promise.all([
      db.cachedCategories.bulkPut(allCategories),
      db.cachedAccounts.bulkPut(accounts),
      db.cachedTransactions.bulkPut(transactions.map(tx => ({ ...tx, userId })))
    ]);

    return {
      success: true,
      categories: allCategories.length,
      accounts: accounts.length,
      transactions: transactions.length
    };
  } catch (error: any) {
    console.error('Cache preload failed:', error);
    return {
      success: false,
      categories: 0,
      accounts: 0,
      transactions: 0,
      error: error.message
    };
  }
}

/**
 * Check if cache has essential data for offline use
 */
export async function hasCacheData(): Promise<boolean> {
  try {
    const [categoriesCount, accountsCount, transactionsCount] = await Promise.all([
      db.cachedCategories.count(),
      db.cachedAccounts.count(),
      db.cachedTransactions.count()
    ]);

    return categoriesCount > 0 && accountsCount > 0 && transactionsCount > 0;
  } catch (error) {
    console.error('Error checking cache data:', error);
    return false;
  }
}

/**
 * Get cached categories by type
 */
export async function getCachedCategories(type: 'income' | 'expense') {
  return await db.cachedCategories
    .where('type')
    .equals(type)
    .toArray();
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
