import { filtersFromPageState, TransactionListFilters } from "@/lib/transactionFilters";

export const TRANSACTIONS_PAGE_STATE_KEY = "transactions-page-state";
const FILTER_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

export type TransactionsPageState = {
  viewType: "income" | "expense";
  filters: TransactionListFilters;
  searchQuery: string;
  searchInputValue: string;
  filtersExpanded: boolean;
  listLimit: number;
  scrollTop: number;
  timestamp?: number;
};

export function readTransactionsPageState(): Partial<TransactionsPageState> | null {
  if (typeof window === "undefined") return null;

  try {
    // Try localStorage first, fallback to sessionStorage for backward compatibility
    let raw = localStorage.getItem(TRANSACTIONS_PAGE_STATE_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(TRANSACTIONS_PAGE_STATE_KEY);
    }
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Check expiration (1 hour)
    if (parsed.timestamp && Date.now() - parsed.timestamp > FILTER_EXPIRATION_MS) {
      localStorage.removeItem(TRANSACTIONS_PAGE_STATE_KEY);
      sessionStorage.removeItem(TRANSACTIONS_PAGE_STATE_KEY);
      return null;
    }

    const filters = filtersFromPageState(parsed);

    return {
      viewType: parsed.viewType || "expense",
      filters,
      searchQuery: parsed.searchQuery ?? "",
      searchInputValue: parsed.searchInputValue ?? "",
      filtersExpanded: parsed.filtersExpanded ?? false,
      listLimit: parsed.listLimit ?? 50,
      scrollTop: parsed.scrollTop ?? 0,
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export function writeTransactionsPageState(state: TransactionsPageState) {
  if (typeof window === "undefined") return;

  const payload: TransactionsPageState = {
    ...state,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(TRANSACTIONS_PAGE_STATE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("Failed to save transaction page state to localStorage:", e);
  }
}

export function clearTransactionsPageState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TRANSACTIONS_PAGE_STATE_KEY);
    sessionStorage.removeItem(TRANSACTIONS_PAGE_STATE_KEY);
  } catch (e) {
    console.error("Failed to clear transaction page state:", e);
  }
}

export function getScrollContainer() {
  return document.querySelector(".scrollable-content");
}
