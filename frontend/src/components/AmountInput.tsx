import { GlassCard } from "./GlassCard";
import { useState } from "react";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  type?: "income" | "expense";
}

// Convert currency code to symbol
const getCurrencySymbol = (code: string = "EUR"): string => {
  const symbols: Record<string, string> = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'JPY': '¥',
    'CHF': 'Fr',
    'CAD': 'C$',
    'AUD': 'A$',
    'CNY': '¥',
    'INR': '₹',
    'RUB': '₽',
    'BRL': 'R$',
    'ZAR': 'R',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'TRY': '₺',
    'MXN': '$',
    'AED': 'د.إ',
    'SAR': '﷼',
  };
  
  return symbols[code.toUpperCase()] || code;
};

export function AmountInput({ value, onChange, currency = "EUR", type = "expense" }: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const symbol = getCurrencySymbol(currency);

  return (
    <GlassCard className={`p-4 transition-all ${isFocused ? 'ring-2 ring-primary/50' : ''}`}>
      <label className="text-xs text-muted-foreground mb-2 block font-medium">
        Importo
      </label>
      <div className="flex items-center gap-2">
        <span 
          className="font-bold text-foreground"
          style={{ fontSize: '30px' }}
        >
          {symbol}
        </span>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="font-bold bg-transparent border-none outline-none w-full text-foreground"
          style={{
            fontSize: '25px',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield'
          }}
        />
      </div>
    </GlassCard>
  );
}

