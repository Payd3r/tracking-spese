import { db, PendingTransaction, PendingUpdate, PendingDelete, PendingTransfer, PendingLoanOperation, setLastSyncTime } from './db';
import { api, isOnline, isServerReachable } from './api';
import { v4 as uuidv4 } from 'uuid';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

// Helper function to check if error is network-related
function isNetworkError(error: any): boolean {
  return !error.response && (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENETUNREACH' ||
    error.code === 'ERR_NETWORK' ||
    error.message?.includes('Network Error') ||
    error.message?.includes('timeout')
  );
}

// Exponential backoff retry with network error handling
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If it's a network error, don't retry - server is unreachable
      if (isNetworkError(error)) {
        throw error;
      }
      
      // For server errors (4xx/5xx), retry with backoff
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Sync pending transactions
async function syncPendingTransactions(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const pending = await db.pendingTransactions.toArray();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const transaction of pending) {
    try {
      await retryWithBackoff(async () => {
        const response = await api.transactions.create({
          accountId: transaction.accountId,
          categoryId: transaction.categoryId,
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          title: transaction.title,
          note: transaction.note,
          transactionDate: transaction.transactionDate
        });
        
        // Remove from pending
        await db.pendingTransactions.delete(transaction.tempId);
        
        // Cache the created transaction
        if (response.data) {
          await db.cachedTransactions.put({
            ...response.data,
            userId: transaction.userId
          });
        }
      });
      
      synced++;
    } catch (error: any) {
      failed++;
      errors.push(`Transaction "${transaction.title}": ${error.message}`);
      console.error('Failed to sync transaction:', error);
    }
  }
  
  return { synced, failed, errors };
}

// Sync pending updates
async function syncPendingUpdates(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const pending = await db.pendingUpdates.toArray();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const update of pending) {
    try {
      await retryWithBackoff(async () => {
        switch (update.entity) {
          case 'transaction':
            await api.transactions.update(update.entityId, update.data);
            break;
          case 'account':
            await api.accounts.update(update.entityId, update.data);
            break;
          case 'category':
            await api.categories.update(update.entityId, update.data);
            break;
          default:
            throw new Error(`Unknown entity type: ${update.entity}`);
        }
        
        // Remove from pending
        await db.pendingUpdates.delete(update.id);
      });
      
      synced++;
    } catch (error: any) {
      failed++;
      errors.push(`Update ${update.entity} #${update.entityId}: ${error.message}`);
      console.error('Failed to sync update:', error);
    }
  }
  
  return { synced, failed, errors };
}

// Sync pending deletes
async function syncPendingDeletes(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const pending = await db.pendingDeletes.toArray();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const deleteOp of pending) {
    try {
      await retryWithBackoff(async () => {
        switch (deleteOp.entity) {
          case 'transaction':
            await api.transactions.delete(deleteOp.entityId);
            break;
          case 'account':
            await api.accounts.delete(deleteOp.entityId);
            break;
          case 'category':
            await api.categories.delete(deleteOp.entityId);
            break;
          case 'transfer':
            await api.transfers.delete(deleteOp.entityId);
            break;
          default:
            throw new Error(`Unknown entity type: ${deleteOp.entity}`);
        }
        
        // Remove from pending
        await db.pendingDeletes.delete(deleteOp.id);
      });
      
      synced++;
    } catch (error: any) {
      // If it's a 404, the item is already deleted - remove from pending
      if (error.response?.status === 404) {
        await db.pendingDeletes.delete(deleteOp.id);
        synced++;
      } else {
        failed++;
        errors.push(`Delete ${deleteOp.entity} #${deleteOp.entityId}: ${error.message}`);
        console.error('Failed to sync delete:', error);
      }
    }
  }
  
  return { synced, failed, errors };
}

// Sync pending transfers (represented as double transaction)
async function syncPendingTransfers(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const pending = await db.pendingTransfers.toArray();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const transfer of pending) {
    try {
      await retryWithBackoff(async () => {
        const fromReqId = uuidv4();
        const toReqId = uuidv4();

        const fromAccount = await db.cachedAccounts.get(transfer.fromAccountId);
        const toAccount = await db.cachedAccounts.get(transfer.toAccountId);
        const expenseCategoryId = transfer.transferExpenseCategoryId;
        const incomeCategoryId = transfer.transferIncomeCategoryId;
        if (!expenseCategoryId || !incomeCategoryId) {
          throw new Error('Categorie trasferimento mancanti');
        }

        // Expense (from account)
        await api.transactions.create({
          accountId: transfer.fromAccountId,
          categoryId: expenseCategoryId,
          amount: transfer.amount,
          currency: transfer.currency || fromAccount?.currency,
          type: 'expense',
          title: transfer.note || `Trasferimento a ${toAccount?.name || 'conto'}`,
          transactionDate: transfer.transferDate,
          clientRequestId: fromReqId
        });

        // Income (to account) - uses original currency for conversion if needed
        await api.transactions.create({
          accountId: transfer.toAccountId,
          categoryId: incomeCategoryId,
          amount: transfer.amount,
          currency: transfer.currency || fromAccount?.currency,
          type: 'income',
          title: transfer.note || `Trasferimento da ${fromAccount?.name || 'conto'}`,
          transactionDate: transfer.transferDate,
          clientRequestId: toReqId
        });

        await db.pendingTransfers.delete(transfer.id);
      });

      synced++;
    } catch (error: any) {
      failed++;
      errors.push(`Transfer ${transfer.note || transfer.id}: ${error.message}`);
      console.error('Failed to sync transfer:', error);
    }
  }

  return { synced, failed, errors };
}

// Sync pending loan operations
async function syncPendingLoanOperations(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const pending = await db.pendingLoanOperations.orderBy('timestamp').toArray();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const op of pending) {
    try {
      await retryWithBackoff(async () => {
        switch (op.type) {
          case 'create': {
            const response = await api.loans.create({
              ...op.data,
              clientRequestId: op.id
            });

            if (op.data?.tempId) {
              await db.cachedLoans.delete(op.data.tempId);
            }
            if (response.data) {
              await db.cachedLoans.put({
                ...response.data,
                userId: op.userId
              });
            }
            break;
          }
          case 'repayment': {
            const loanId = op.loanId || op.data?.loanId;
            if (!loanId) {
              throw new Error('loanId mancante per la repayment');
            }
            const response = await api.loans.addRepayment(loanId, {
              ...op.data,
              clientRequestId: op.id
            });

            if (op.data?.tempId) {
              await db.cachedLoanRepayments.delete(op.data.tempId);
            }
            if (response.data) {
              await db.cachedLoanRepayments.put(response.data);
            }
            break;
          }
          case 'close': {
            const loanId = op.loanId || op.data?.loanId;
            if (!loanId) {
              throw new Error('loanId mancante per la chiusura');
            }
            await api.loans.close(loanId, { clientRequestId: op.id });
            await db.cachedLoans.update(loanId, { status: 'closed' });
            break;
          }
          case 'delete': {
            const loanId = op.loanId || op.data?.loanId;
            if (!loanId) {
              throw new Error('loanId mancante per la cancellazione');
            }
            await api.loans.delete(loanId);
            await db.cachedLoans.delete(loanId);
            await db.cachedLoanRepayments.where('loanId').equals(loanId).delete();
            break;
          }
          default:
            throw new Error(`Operazione prestito sconosciuta: ${op.type}`);
        }

        await db.pendingLoanOperations.delete(op.id);
      });

      synced++;
    } catch (error: any) {
      failed++;
      errors.push(`Loan op ${op.type} (${op.loanId || op.id}): ${error.message}`);
      console.error('Failed to sync loan operation:', error);
    }
  }

  return { synced, failed, errors };
}

// Main sync function
export async function syncData(): Promise<SyncResult> {
  if (!isOnline()) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['Nessuna connessione internet']
    };
  }
  
  if (!isServerReachable()) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['Server non raggiungibile']
    };
  }
  
  try {
    // Sync in order: deletes -> updates -> creates
    const deleteResults = await syncPendingDeletes();
    const updateResults = await syncPendingUpdates();
    const transferResults = await syncPendingTransfers();
    const loanResults = await syncPendingLoanOperations();
    const transactionResults = await syncPendingTransactions();
    
    const totalSynced = deleteResults.synced + updateResults.synced + transferResults.synced + loanResults.synced + transactionResults.synced;
    const totalFailed = deleteResults.failed + updateResults.failed + transferResults.failed + loanResults.failed + transactionResults.failed;
    const allErrors = [...deleteResults.errors, ...updateResults.errors, ...transferResults.errors, ...loanResults.errors, ...transactionResults.errors];
    
    // Update last sync time
    await setLastSyncTime(new Date());
    
    return {
      success: totalFailed === 0,
      synced: totalSynced,
      failed: totalFailed,
      errors: allErrors
    };
  } catch (error: any) {
    console.error('Sync failed:', error);
    return {
      success: false,
      synced: 0,
      failed: 1,
      errors: [error.message]
    };
  }
}

// Add transaction to pending queue (for offline mode)
export async function addPendingTransaction(
  userId: string,
  transaction: Omit<PendingTransaction, 'tempId' | 'userId' | 'createdAt' | 'categoryName' | 'categoryIcon' | 'categoryColor' | 'accountName' | 'accountCurrency'>
): Promise<string> {
  const tempId = uuidv4();
  
  // Get category and account metadata for display
  const category = await db.cachedCategories.get(transaction.categoryId);
  const account = await db.cachedAccounts.get(transaction.accountId);
  
  await db.pendingTransactions.add({
    tempId,
    userId,
    ...transaction,
    categoryName: category?.name,
    categoryIcon: category?.icon,
    categoryColor: category?.color,
    accountName: account?.name,
    accountCurrency: account?.currency,
    createdAt: new Date().toISOString()
  });
  
  return tempId;
}

// Add update to pending queue
export async function addPendingUpdate(
  entity: 'transaction' | 'account' | 'category' | 'transfer',
  entityId: number,
  data: any
): Promise<void> {
  await db.pendingUpdates.add({
    id: uuidv4(),
    entity,
    entityId,
    data,
    timestamp: new Date().toISOString()
  });
}

// Add delete to pending queue
export async function addPendingDelete(
  entity: 'transaction' | 'account' | 'category' | 'transfer',
  entityId: number
): Promise<void> {
  await db.pendingDeletes.add({
    id: uuidv4(),
    entity,
    entityId,
    timestamp: new Date().toISOString()
  });
}

// Add transfer to pending queue
export async function addPendingTransfer(
  userId: string,
  transfer: Omit<PendingTransfer, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = uuidv4();

  await db.pendingTransfers.add({
    id,
    userId,
    ...transfer,
    createdAt: new Date().toISOString()
  });

  return id;
}

// Add loan operation to pending queue
export async function addPendingLoanOperation(
  userId: string,
  operation: Omit<PendingLoanOperation, 'id' | 'userId'>
): Promise<string> {
  const id = uuidv4();

  await db.pendingLoanOperations.add({
    id,
    userId,
    ...operation
  });

  return id;
}


