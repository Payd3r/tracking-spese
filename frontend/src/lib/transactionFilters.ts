import { format } from "date-fns";
import { Transaction } from "@/types/api";

export const TRANSACTIONS_PAGE_SIZE = 50;

export type DatePreset = "all" | "yesterday" | "last_week" | "this_month" | "last_month" | "this_year" | "custom";
export type SortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "title_asc";

export type TransactionListFilters = {
  accountIds: number[];
  categoryIds: number[];
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  noteQuery: string;
  minAmount: number | null;
  maxAmount: number | null;
  includeLoans: boolean;
  sortBy: SortOption;
};

export const EMPTY_TRANSACTION_FILTERS: TransactionListFilters = {
  accountIds: [],
  categoryIds: [],
  datePreset: "all",
  startDate: "",
  endDate: "",
  noteQuery: "",
  minAmount: null,
  maxAmount: null,
  includeLoans: false,
  sortBy: "date_desc",
};

export function getTodayDateString() {
  return format(new Date(), "yyyy-MM-dd");
}

export function getDateRangeFromPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = format(yesterday, "yyyy-MM-dd");
      return {
        startDate: yStr,
        endDate: yStr,
      };
    }
    case "last_week": {
      const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const mondayLastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay - 7);
      const sundayLastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDay - 1);
      return {
        startDate: format(mondayLastWeek, "yyyy-MM-dd"),
        endDate: format(sundayLastWeek, "yyyy-MM-dd"),
      };
    }
    case "this_month":
      return {
        startDate: format(new Date(year, month, 1), "yyyy-MM-dd"),
        endDate: format(new Date(year, month + 1, 0), "yyyy-MM-dd"),
      };
    case "last_month":
      return {
        startDate: format(new Date(year, month - 1, 1), "yyyy-MM-dd"),
        endDate: format(new Date(year, month, 0), "yyyy-MM-dd"),
      };
    case "this_year":
      return {
        startDate: format(new Date(year, 0, 1), "yyyy-MM-dd"),
        endDate: format(new Date(year, 11, 31), "yyyy-MM-dd"),
      };
    case "all":
    case "custom":
    default:
      return { startDate: "", endDate: "" };
  }
}

export function resolveEndDate(startDate: string, endDate: string) {
  if (!startDate) return endDate;
  if (endDate) return endDate;
  return getTodayDateString();
}

export function getAbsoluteAmount(transaction: Transaction) {
  return Math.abs(transaction.amount);
}

export function computeAmountBounds(transactions: Transaction[]) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { min: 0, max: 0 };
  }

  const amounts = transactions.map(getAbsoluteAmount);
  return {
    min: Math.min(...amounts),
    max: Math.max(...amounts),
  };
}

export function getSliderStep(min: number, max: number) {
  const range = max - min;
  if (range <= 0) return 1;
  if (range <= 20) return 0.5;
  if (range <= 200) return 1;
  if (range <= 2000) return 5;
  return 10;
}

export function filterTransactionsByAmount(
  transactions: Transaction[],
  minAmount: number | null,
  maxAmount: number | null
) {
  if (!Array.isArray(transactions)) return [];
  if (minAmount === null || maxAmount === null) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    const amount = getAbsoluteAmount(transaction);
    return amount >= minAmount && amount <= maxAmount;
  });
}

export function sortTransactions(transactions: Transaction[], sortBy: SortOption): Transaction[] {
  if (!Array.isArray(transactions)) return [];
  const list = [...transactions];
  return list.sort((a, b) => {
    switch (sortBy) {
      case "date_asc": {
        const diff = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
        if (diff !== 0) return diff;
        return a.id - b.id;
      }
      case "amount_desc": {
        const diff = Math.abs(b.amount) - Math.abs(a.amount);
        if (diff !== 0) return diff;
        return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      }
      case "amount_asc": {
        const diff = Math.abs(a.amount) - Math.abs(b.amount);
        if (diff !== 0) return diff;
        return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      }
      case "title_asc": {
        return (a.title || "").localeCompare(b.title || "");
      }
      case "date_desc":
      default: {
        const diff = new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
        if (diff !== 0) return diff;
        return b.id - a.id;
      }
    }
  });
}

export function normalizeAmountFilter(
  minAmount: number | null,
  maxAmount: number | null,
  bounds: { min: number; max: number }
) {
  const min = minAmount ?? bounds.min;
  const max = maxAmount ?? bounds.max;
  const isFullRange = bounds.max <= bounds.min || (min <= bounds.min && max >= bounds.max);

  return {
    minAmount: isFullRange ? null : min,
    maxAmount: isFullRange ? null : max,
  };
}

export function isAmountFilterActive(
  minAmount: number | null,
  maxAmount: number | null,
  bounds: { min: number; max: number }
) {
  if (minAmount === null || maxAmount === null) return false;
  return minAmount > bounds.min || maxAmount < bounds.max;
}

export function countActiveFilters(
  filters: TransactionListFilters,
  bounds: { min: number; max: number }
): number {
  if (!filters) return 0;
  let count = 0;
  if (Array.isArray(filters.accountIds) && filters.accountIds.length > 0) count++;
  if (Array.isArray(filters.categoryIds) && filters.categoryIds.length > 0) count++;
  if (filters.datePreset && filters.datePreset !== "all") count++;
  if (filters.startDate || filters.endDate) count++;
  if (filters.noteQuery && filters.noteQuery.trim() !== "") count++;
  if (isAmountFilterActive(filters.minAmount, filters.maxAmount, bounds)) count++;
  if (filters.includeLoans) count++;
  if (filters.sortBy && filters.sortBy !== "date_desc") count++;
  return count;
}

export function filtersFromPageState(state: any | null): TransactionListFilters {
  if (!state) return { ...EMPTY_TRANSACTION_FILTERS };

  const rawFilters = state.filters || state;

  let accountIds: number[] = [];
  if (Array.isArray(rawFilters.accountIds)) {
    accountIds = rawFilters.accountIds.filter((id: any) => typeof id === "number" && !isNaN(id));
  } else if (typeof rawFilters.accountId === "number") {
    accountIds = [rawFilters.accountId];
  } else if (typeof state.selectedAccountFilter === "number") {
    accountIds = [state.selectedAccountFilter];
  }

  let categoryIds: number[] = [];
  if (Array.isArray(rawFilters.categoryIds)) {
    categoryIds = rawFilters.categoryIds.filter((id: any) => typeof id === "number" && !isNaN(id));
  } else if (typeof rawFilters.categoryId === "number") {
    categoryIds = [rawFilters.categoryId];
  } else if (typeof state.selectedCategoryFilter === "number") {
    categoryIds = [state.selectedCategoryFilter];
  }

  return {
    accountIds,
    categoryIds,
    datePreset: rawFilters.datePreset || "all",
    startDate: rawFilters.startDate ?? state.selectedStartDate ?? "",
    endDate: rawFilters.endDate ?? state.selectedEndDate ?? "",
    noteQuery: rawFilters.noteQuery ?? state.noteQuery ?? "",
    minAmount: typeof rawFilters.minAmount === "number" ? rawFilters.minAmount : null,
    maxAmount: typeof rawFilters.maxAmount === "number" ? rawFilters.maxAmount : null,
    includeLoans: Boolean(rawFilters.includeLoans),
    sortBy: rawFilters.sortBy || "date_desc",
  };
}
