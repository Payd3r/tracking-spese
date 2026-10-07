import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { IconRenderer } from "@/components/IconRenderer";
import { MobileDateInput } from "@/components/MobileDateInput";
import { BottomSheet } from "@/components/BottomSheet";
import { Account, Category } from "@/types/api";
import {
  DatePreset,
  getDateRangeFromPreset,
  getSliderStep,
  SortOption,
  TransactionListFilters,
} from "@/lib/transactionFilters";
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Filter, RotateCcw, ArrowUpDown, Calendar, Wallet, Tag, Banknote, FileText, ArrowDown, ArrowUp, ArrowDownAZ } from "lucide-react";

const SORT_OPTIONS: {
  id: SortOption;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "date_desc", label: "Più recenti", icon: ArrowDown },
  { id: "date_asc", label: "Meno recenti", icon: ArrowUp },
  { id: "amount_desc", label: "Importo maggiore", icon: ArrowDown },
  { id: "amount_asc", label: "Importo minore", icon: ArrowUp },
  { id: "title_asc", label: "Titolo (A-Z)", icon: ArrowDownAZ },
];

interface TransactionFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftFilters: TransactionListFilters;
  setDraftFilters: React.Dispatch<React.SetStateAction<TransactionListFilters>>;
  accounts: Account[];
  categories: Category[];
  amountBounds: { min: number; max: number };
  activeCount: number;
  totalFilteredCount: number;
  onApply: () => void;
  onClear: () => void;
}

export function TransactionFiltersSheet({
  open,
  onOpenChange,
  draftFilters,
  setDraftFilters,
  accounts,
  categories,
  amountBounds,
  activeCount,
  totalFilteredCount,
  onApply,
  onClear,
}: TransactionFiltersSheetProps) {
  const isMobile = useIsMobile();

  const [minInput, setMinInput] = useState<string>(
    draftFilters.minAmount !== null ? String(draftFilters.minAmount) : ""
  );
  const [maxInput, setMaxInput] = useState<string>(
    draftFilters.maxAmount !== null ? String(draftFilters.maxAmount) : ""
  );

  useEffect(() => {
    setMinInput(draftFilters.minAmount !== null ? String(draftFilters.minAmount) : "");
    setMaxInput(draftFilters.maxAmount !== null ? String(draftFilters.maxAmount) : "");
  }, [draftFilters.minAmount, draftFilters.maxAmount, open]);

  const sliderStep = getSliderStep(amountBounds.min, amountBounds.max);
  const currentMin = draftFilters.minAmount ?? amountBounds.min;
  const currentMax = draftFilters.maxAmount ?? amountBounds.max;

  const handleDatePresetChange = (preset: DatePreset) => {
    if (preset === "custom") {
      setDraftFilters((prev) => ({ ...prev, datePreset: "custom" }));
    } else {
      const range = getDateRangeFromPreset(preset);
      setDraftFilters((prev) => ({
        ...prev,
        datePreset: preset,
        startDate: range.startDate,
        endDate: range.endDate,
      }));
    }
  };

  const toggleAccount = (id: number) => {
    setDraftFilters((prev) => {
      const exists = prev.accountIds.includes(id);
      const updated = exists ? prev.accountIds.filter((aId) => aId !== id) : [...prev.accountIds, id];
      return { ...prev, accountIds: updated };
    });
  };

  const toggleCategory = (id: number) => {
    setDraftFilters((prev) => {
      const exists = prev.categoryIds.includes(id);
      const updated = exists ? prev.categoryIds.filter((cId) => cId !== id) : [...prev.categoryIds, id];
      return { ...prev, categoryIds: updated };
    });
  };

  const handleMinInputChange = (val: string) => {
    setMinInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setDraftFilters((prev) => ({ ...prev, minAmount: num }));
    } else if (val === "") {
      setDraftFilters((prev) => ({ ...prev, minAmount: null }));
    }
  };

  const handleMaxInputChange = (val: string) => {
    setMaxInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setDraftFilters((prev) => ({ ...prev, maxAmount: num }));
    } else if (val === "") {
      setDraftFilters((prev) => ({ ...prev, maxAmount: null }));
    }
  };

  if (!isMobile) return null;

  return (
    <BottomSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      className="bg-[hsl(0_0%_5%/0.96)] text-white border-t border-white/10"
      header={
        <div className="pb-3 border-b border-white/10 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-bold text-white tracking-tight">Filtri &amp; Ordinamento</h2>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white text-black">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      }
      footer={
        <Button
          onClick={onApply}
          size="lg"
          className="w-full h-12 pill-active text-sm font-bold rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        >
          Applica Filtri ({totalFilteredCount} transazioni)
        </Button>
      }
    >
      <div className="py-4 space-y-6 pr-1">
        {/* Preset Date */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" /> Periodo
          </label>
          <div className="flex flex-wrap gap-x-2 gap-y-2.5 py-0.5">
            {[
              { id: "all", label: "Tutto" },
              { id: "yesterday", label: "Ieri" },
              { id: "last_week", label: "Scorsa settimana" },
              { id: "this_month", label: "Questo mese" },
              { id: "last_month", label: "Mese scorso" },
              { id: "this_year", label: "Quest'anno" },
              { id: "custom", label: "Personalizzato" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleDatePresetChange(p.id as DatePreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold filter-chip ${
                  draftFilters.datePreset === p.id
                    ? "pill-active"
                    : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {draftFilters.datePreset === "custom" && (
            <div className="flex gap-2 mt-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Data Inizio</label>
                <MobileDateInput
                  compact
                  placeholder="Inizio"
                  value={draftFilters.startDate}
                  onChange={(startDate) => setDraftFilters((prev) => ({ ...prev, startDate }))}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Data Fine</label>
                <MobileDateInput
                  compact
                  placeholder="Fine"
                  value={draftFilters.endDate}
                  onChange={(endDate) => setDraftFilters((prev) => ({ ...prev, endDate }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Nota */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" /> Note
          </label>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <input
              type="text"
              value={draftFilters.noteQuery}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, noteQuery: e.target.value }))}
              placeholder="Cerca testo nelle note..."
              className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Ordinamento */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <ArrowUpDown className="w-3.5 h-3.5" /> Ordina Per
          </label>
          <div className="flex flex-wrap gap-x-2 gap-y-2.5 py-0.5">
            {SORT_OPTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setDraftFilters((prev) => ({ ...prev, sortBy: s.id }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 filter-chip ${
                    draftFilters.sortBy === s.id
                      ? "pill-active"
                      : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prestiti Toggle */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-xs font-semibold text-white block">Includi Prestiti nei totali</span>
              <span className="text-[10px] text-muted-foreground block">
                Include i prestiti nel calcolo di entrate e uscite
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDraftFilters((prev) => ({ ...prev, includeLoans: !prev.includeLoans }))}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
              draftFilters.includeLoans ? "bg-white" : "bg-white/20"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black transition-transform ${
                draftFilters.includeLoans ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Conti */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5" /> Conti
          </label>
          <div className="flex flex-wrap gap-x-2 gap-y-2.5 py-0.5">
            <button
              type="button"
              onClick={() => setDraftFilters((prev) => ({ ...prev, accountIds: [] }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold filter-chip ${
                draftFilters.accountIds.length === 0
                  ? "pill-active"
                  : "bg-white/5 text-muted-foreground border border-white/10"
              }`}
            >
              Tutti
            </button>
            {accounts.map((acc) => {
              const isSelected = draftFilters.accountIds.includes(acc.id);
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggleAccount(acc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold filter-chip ${
                    isSelected
                      ? "pill-active"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  }`}
                >
                  {acc.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categorie */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5" /> Categorie
          </label>
          <div className="flex flex-wrap gap-x-2 gap-y-2.5 py-0.5 max-h-[180px] overflow-y-auto overflow-x-visible pr-1">
            <button
              type="button"
              onClick={() => setDraftFilters((prev) => ({ ...prev, categoryIds: [] }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold filter-chip ${
                draftFilters.categoryIds.length === 0
                  ? "pill-active"
                  : "bg-white/5 text-muted-foreground border border-white/10"
              }`}
            >
              Tutte
            </button>
            {categories.map((cat) => {
              const isSelected = draftFilters.categoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-semibold filter-chip ${
                    isSelected
                      ? "pill-active"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  }`}
                >
                  <IconRenderer icon={cat.icon} size={13} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Range Importo */}
        {amountBounds.max >= amountBounds.min && (
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Banknote className="w-3.5 h-3.5" /> Importo (€)
            </label>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex gap-2 items-center">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-semibold">Min</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={String(amountBounds.min)}
                    value={minInput}
                    onChange={(e) => handleMinInputChange(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-muted-foreground/40 font-mono"
                  />
                  <span className="text-xs text-muted-foreground">€</span>
                </div>
                <span className="text-xs text-muted-foreground">–</span>
                <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-semibold">Max</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={String(amountBounds.max)}
                    value={maxInput}
                    onChange={(e) => handleMaxInputChange(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-muted-foreground/40 font-mono"
                  />
                  <span className="text-xs text-muted-foreground">€</span>
                </div>
              </div>

              <Slider
                min={amountBounds.min}
                max={amountBounds.max}
                step={sliderStep}
                value={[currentMin, currentMax]}
                disabled={amountBounds.min === amountBounds.max}
                onValueChange={([min, max]) => {
                  setMinInput(String(min));
                  setMaxInput(String(max));
                  setDraftFilters((prev) => ({ ...prev, minAmount: min, maxAmount: max }));
                }}
                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-white [&_[role=slider]]:bg-white [&_.bg-primary]:bg-white [&_.bg-secondary]:bg-white/10"
              />

              <p className="text-[10px] text-muted-foreground text-center">
                Range disponibile: {formatCurrency(amountBounds.min)} € – {formatCurrency(amountBounds.max)} €
              </p>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
