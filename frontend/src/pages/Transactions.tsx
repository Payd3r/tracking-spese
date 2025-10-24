import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, Filter, Clock } from "lucide-react";
import { Link, Link as RouterLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Category, Transaction, Account } from "@/types/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { getCachedCategories, getCachedAccounts, getCachedTransactions } from "@/lib/cacheManager";

export default function Transactions() {
  const { isOnline } = useSync();
  const [viewType, setViewType] = useState<"income" | "expense">("expense");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<number | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null);
  
  // Temporary filter states (before applying)
  const [tempAccountFilter, setTempAccountFilter] = useState<number | null>(null);
  const [tempCategoryFilter, setTempCategoryFilter] = useState<number | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const LIMIT = 50;

  useEffect(() => {
    setOffset(0); // Reset offset when filters change
    loadData(true);
  }, [viewType, selectedAccountFilter, selectedCategoryFilter]);
  
  const applyFilters = () => {
    setSelectedAccountFilter(tempAccountFilter);
    setSelectedCategoryFilter(tempCategoryFilter);
    setFiltersExpanded(false);
  };
  
  const clearFilters = () => {
    setTempAccountFilter(null);
    setTempCategoryFilter(null);
    setSelectedAccountFilter(null);
    setSelectedCategoryFilter(null);
  };
  
  const loadMoreTransactions = async () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    await loadData(false, newOffset);
  };

  const loadData = async (reset: boolean = true, customOffset?: number) => {
    try {
      const currentOffset = customOffset !== undefined ? customOffset : (reset ? 0 : offset);
      
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      if (isOnline) {
        // Online: fetch from API and cache
        if (reset) {
          // Load categories and accounts only on reset
          const [categoriesResponse, accountsResponse, transactionsResponse] = await Promise.all([
            api.categories.getAll(viewType),
            api.accounts.getAll(),
            api.transactions.getAll({
              type: viewType,
              accountId: selectedAccountFilter || undefined,
              categoryId: selectedCategoryFilter || undefined,
              limit: LIMIT,
              offset: currentOffset
            })
          ]);

          // Ensure arrays
          const categoriesData = Array.isArray(categoriesResponse.data.categories) ? categoriesResponse.data.categories : [];
          const accountsData = Array.isArray(accountsResponse.data.accounts) ? accountsResponse.data.accounts : [];
          const transactions = transactionsResponse.data.transactions || [];
          const total = transactionsResponse.data.total || 0;
          
          setCategories(categoriesData);
          setAccounts(accountsData);
          setTransactions(Array.isArray(transactions) ? transactions : []);
          setTotalTransactions(total);
          
          // Cache data for offline use
          await db.cachedCategories.bulkPut(categoriesData);
          await db.cachedAccounts.bulkPut(accountsData);
          
          if (Array.isArray(transactions)) {
            const user = localStorage.getItem('user');
            const userId = user ? JSON.parse(user).id : '';
            const txsWithUser = transactions.map(tx => ({ ...tx, userId }));
            await db.cachedTransactions.bulkPut(txsWithUser);
          }
        } else {
          // Load more transactions
          const transactionsResponse = await api.transactions.getAll({
            type: viewType,
            accountId: selectedAccountFilter || undefined,
            categoryId: selectedCategoryFilter || undefined,
            limit: LIMIT,
            offset: currentOffset
          });
          
          const newTransactions = transactionsResponse.data.transactions || [];
          const total = transactionsResponse.data.total || 0;
          
          setTransactions(prev => [...prev, ...(Array.isArray(newTransactions) ? newTransactions : [])]);
          setTotalTransactions(total);
          
          // Cache new transactions
          if (Array.isArray(newTransactions)) {
            const user = localStorage.getItem('user');
            const userId = user ? JSON.parse(user).id : '';
            const txsWithUser = newTransactions.map(tx => ({ ...tx, userId }));
            await db.cachedTransactions.bulkPut(txsWithUser);
          }
        }
      } else {
        // Offline: load from cache using cacheManager
        const cachedTransactions = await getCachedTransactions({
          type: viewType,
          accountId: selectedAccountFilter || undefined,
          categoryId: selectedCategoryFilter || undefined,
          limit: LIMIT
        });
        
        const total = cachedTransactions.length;
        const paginatedTransactions = cachedTransactions.slice(currentOffset, currentOffset + LIMIT);
        
        if (reset) {
          const cachedCategories = await getCachedCategories(viewType);
          const cachedAccounts = await getCachedAccounts();
          
          setCategories(cachedCategories);
          setAccounts(cachedAccounts);
          setTransactions(paginatedTransactions);
        } else {
          setTransactions(prev => [...prev, ...paginatedTransactions]);
        }
        
        setTotalTransactions(total);
      }

      // Load pending transactions and merge with current transactions
      const pendingTxs = await db.pendingTransactions
        .where('type')
        .equals(viewType)
        .toArray();

      if (pendingTxs.length > 0) {
        const mergedPendingTxs = pendingTxs.map(pt => ({
          ...pt,
          id: parseInt(pt.tempId.replace(/\D/g, '')), // Convert tempId to number
          accountName: pt.accountName || 'Account sconosciuto',
          categoryName: pt.categoryName || 'Categoria sconosciuta',
          accountCurrency: pt.accountCurrency || 'EUR',
          categoryIcon: pt.categoryIcon || 'HelpCircle',
          categoryColor: pt.categoryColor || 'gradient-gray',
          isPending: true,
          updatedAt: pt.createdAt // Use createdAt as updatedAt for pending
        }));

        if (reset) {
          setTransactions(prev => [...mergedPendingTxs, ...prev]);
        } else {
          setTransactions(prev => [...prev, ...mergedPendingTxs]);
        }
        setTotalTransactions(prev => prev + pendingTxs.length);
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setError(err.response?.data?.message || "Errore nel caricamento dei dati");
      if (reset) {
        setCategories([]);
        setAccounts([]);
        setTransactions([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Listen for data synced event
  useEffect(() => {
    const handleDataSynced = () => {
      loadData(true); // Reload all data after sync
    };
    window.addEventListener('dataSynced', handleDataSynced);
    return () => {
      window.removeEventListener('dataSynced', handleDataSynced);
    };
  }, [viewType, selectedAccountFilter, selectedCategoryFilter]);

  const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">Tutte le transazioni</h1>
        <button 
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="p-1.5 glass-card rounded-2xl transition-all"
        >
          {filtersExpanded ? <ChevronUp className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
        </button>
      </div>

      {error && (
        <div className="glass-card p-4 mb-6 bg-red-500/20 border border-red-500/50">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Toggle Income/Expense */}
      <GlassCard className="p-2 mb-4 flex gap-2">
        <button 
          onClick={() => setViewType("expense")}
          className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-all ${
            viewType === "expense" ? "gradient-blue text-white" : "text-muted-foreground"
          }`}
        >
          Uscite
        </button>
        <button 
          onClick={() => setViewType("income")}
          className={`flex-1 py-2 rounded-2xl text-sm font-medium transition-all ${
            viewType === "income" ? "gradient-blue text-white" : "text-muted-foreground"
          }`}
        >
          Entrate
        </button>
      </GlassCard>

      {/* Expandable Filters */}
      {filtersExpanded && (
        <GlassCard className="p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3">Filtri</h3>
          
          {/* Account Filter */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">Conto</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTempAccountFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  tempAccountFilter === null 
                    ? "bg-primary text-white" 
                    : "glass-card text-white/70"
                }`}
              >
                Tutti
              </button>
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => setTempAccountFilter(account.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    tempAccountFilter === account.id 
                      ? "bg-primary text-white" 
                      : "glass-card text-white/70"
                  }`}
                >
                  {account.name}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-2 block">Categoria</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTempCategoryFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  tempCategoryFilter === null 
                    ? "bg-primary text-white" 
                    : "glass-card text-white/70"
                }`}
              >
                Tutte
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setTempCategoryFilter(category.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                    tempCategoryFilter === category.id 
                      ? "bg-primary text-white" 
                      : "glass-card text-white/70"
                  }`}
                >
                  <IconRenderer icon={category.icon} size={14} />
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Apply/Clear Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
            >
              Cancella
            </Button>
            <Button
              onClick={applyFilters}
              size="sm"
              className="flex-1 gradient-blue text-white text-xs h-8"
            >
              Applica
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Active Filters Display */}
      {(selectedAccountFilter || selectedCategoryFilter) && (
        <div className="mb-3 flex gap-2 flex-wrap">
          {selectedAccountFilter && (
            <div className="glass-card px-3 py-1.5 text-xs flex items-center gap-2">
              <span>Conto: {accounts.find(a => a.id === selectedAccountFilter)?.name}</span>
              <button onClick={() => setSelectedAccountFilter(null)} className="text-red-400">×</button>
            </div>
          )}
          {selectedCategoryFilter && (
            <div className="glass-card px-3 py-1.5 text-xs flex items-center gap-2">
              <span>Categoria: {categories.find(c => c.id === selectedCategoryFilter)?.name}</span>
              <button onClick={() => setSelectedCategoryFilter(null)} className="text-red-400">×</button>
            </div>
          )}
        </div>
      )}

      {/* Transactions List */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            {totalTransactions} {totalTransactions === 1 ? 'Transazione' : 'Transazioni'}
          </h2>
          <span className="text-base font-bold">€ {totalAmount.toFixed(2)}</span>
        </div>

        {transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nessuna transazione trovata</p>
        ) : (
          <>
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <RouterLink key={transaction.id} to={`/transaction/${transaction.id}`}>
                  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer rounded-lg px-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${transaction.categoryColor || 'gradient-blue'} flex items-center justify-center`}>
                        <IconRenderer icon={transaction.categoryIcon} size={16} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{transaction.title}</h4>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${
                      transaction.isPending 
                        ? 'text-orange-400'  // Pending = arancione
                        : transaction.type === 'income' 
                          ? 'text-success' 
                          : 'text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}€ {Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                </RouterLink>
              ))}
            </div>
            
            {/* Load More Button */}
            {transactions.length < totalTransactions && (
              <Button
                onClick={loadMoreTransactions}
                disabled={loadingMore}
                variant="outline"
                className="w-full mt-4 h-11 text-sm font-medium"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Caricamento...
                  </>
                ) : (
                  `Altre... (${totalTransactions - transactions.length} rimanenti)`
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
