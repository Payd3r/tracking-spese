import { GlassCard } from "@/components/GlassCard";
import { AmountInput } from "@/components/AmountInput";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Account {
  id: number;
  name: string;
  balance: number;
  currency: string;
  icon?: string;
}

interface Category {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  type: 'income' | 'expense';
  isSystem: boolean;
}

export default function ManageTransfers() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transferCategories, setTransferCategories] = useState<{
    expense?: Category;
    income?: Category;
  }>({});
  const [fromAccount, setFromAccount] = useState<number | null>(null);
  const [toAccount, setToAccount] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load accounts
      const accountsResponse = await api.accounts.getAll();
      setAccounts(accountsResponse.data.accounts);
      
      // Set default accounts if available
      if (accountsResponse.data.accounts.length >= 2) {
        setFromAccount(accountsResponse.data.accounts[0].id);
        setToAccount(accountsResponse.data.accounts[1].id);
      } else if (accountsResponse.data.accounts.length === 1) {
        setFromAccount(accountsResponse.data.accounts[0].id);
      }
      
      // Load transfer categories
      const categoriesResponse = await api.categories.getAll();
      const categories = categoriesResponse.data.categories;
      
      // Find transfer categories (system categories named "Trasferimento")
      const expenseTransferCat = categories.find(
        (cat: Category) => cat.name === 'Trasferimento' && cat.type === 'expense' && cat.isSystem
      );
      const incomeTransferCat = categories.find(
        (cat: Category) => cat.name === 'Trasferimento' && cat.type === 'income' && cat.isSystem
      );
      
      setTransferCategories({
        expense: expenseTransferCat,
        income: incomeTransferCat,
      });
      
      if (!expenseTransferCat || !incomeTransferCat) {
        toast.error("Categorie di trasferimento non trovate. Esegui le migrazioni del database.");
      }
    } catch (error) {
      console.error('Errore nel caricamento dei dati:', error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateTransfer = async () => {
    // Validation
    if (!fromAccount || !toAccount) {
      toast.error("Seleziona entrambi i conti");
      return;
    }
    
    if (fromAccount === toAccount) {
      toast.error("I conti di origine e destinazione devono essere diversi");
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    
    if (!transferCategories.expense || !transferCategories.income) {
      toast.error("Categorie di trasferimento non disponibili");
      return;
    }
    
    try {
      setLoading(true);
      
      const transferDate = new Date().toISOString();
      const fromAccountData = accounts.find(acc => acc.id === fromAccount);
      const toAccountData = accounts.find(acc => acc.id === toAccount);
      
      // Create expense transaction (money leaving fromAccount)
      await api.transactions.create({
        accountId: fromAccount,
        categoryId: transferCategories.expense.id,
        amount: amountNum,
        type: 'expense',
        title: `Trasferimento a ${toAccountData?.name || 'conto'}`,
        transactionDate: transferDate,
      });
      
      // Create income transaction (money entering toAccount)
      // The backend will handle currency conversion if needed
      await api.transactions.create({
        accountId: toAccount,
        categoryId: transferCategories.income.id,
        amount: amountNum,
        currency: fromAccountData?.currency, // Use source account currency
        type: 'income',
        title: `Trasferimento da ${fromAccountData?.name || 'conto'}`,
        transactionDate: transferDate,
      });
      
      toast.success("Trasferimento creato con successo!");
      
      // Reset form
      setAmount("");
      
      // Reload accounts to update balances
      await loadData();
      
    } catch (error: any) {
      console.error('Errore nella creazione del trasferimento:', error);
      const errorMsg = error.response?.data?.error || "Errore nella creazione del trasferimento";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getAccountDisplay = (account: Account) => {
    return `${account.currency} ${account.balance.toFixed(2)}`;
  };

  if (loadingData) {
    return (
      <div className="px-3 pt-4 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/settings" className="p-1.5 glass-card rounded-2xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Trasferimenti</h1>
        </div>
        <div className="text-center text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="px-3 pt-4 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/settings" className="p-1.5 glass-card rounded-2xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Trasferimenti</h1>
        </div>
        <GlassCard className="p-4">
          <p className="text-center text-muted-foreground mb-4">
            Nessun conto disponibile. Crea almeno due conti per effettuare trasferimenti.
          </p>
          <Button 
            className="w-full pill-active"
            onClick={() => navigate('/manage-accounts')}
          >
            Vai ai Conti
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/settings" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Trasferimenti</h1>
      </div>

      {/* New Transfer Form */}
      <GlassCard className="p-4 mb-4">        
        {/* From Account */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-2 block font-medium">Da</label>
          <div className="space-y-1.5">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setFromAccount(account.id)}
                disabled={loading}
                className={`w-full p-2.5 flex justify-between items-center transition-all rounded-2xl interactive-press ${
                  fromAccount === account.id ? "pill-active" : "glass-card"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="font-medium text-xs">{account.name}</span>
                <span className="text-[10px]">{getAccountDisplay(account)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* To Account */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-2 block font-medium">A</label>
          <div className="space-y-1.5">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setToAccount(account.id)}
                disabled={loading}
                className={`w-full p-2.5 flex justify-between items-center transition-all rounded-2xl interactive-press ${
                  toAccount === account.id ? "pill-active" : "glass-card"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="font-medium text-xs">{account.name}</span>
                <span className="text-[10px]">{getAccountDisplay(account)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="mb-3">
          <AmountInput
            value={amount}
            onChange={setAmount}
            currency={fromAccount ? accounts.find(a => a.id === fromAccount)?.currency : 'EUR'}
          />
        </div>

        <Button 
          className="w-full h-10 text-sm pill-active"
          onClick={handleCreateTransfer}
          disabled={loading}
        >
          {loading ? "Creazione..." : "Crea Trasferimento"}
        </Button>
      </GlassCard>
    </div>
  );
}
