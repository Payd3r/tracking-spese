import { GlassCard } from "./GlassCard";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState, useId } from "react";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function DateInput({ value, onChange }: DateInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useId();

  const formatDateDisplay = (dateStr: string) => {
    try {
      if (!dateStr) return "Seleziona una data";
      return format(new Date(dateStr), "EEEE, d MMMM yyyy", { locale: it });
    } catch {
      return "Seleziona una data";
    }
  };

  const handleClick = () => {
    // For mobile devices, we'll use a more direct approach
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      // Force focus and show picker
      input.focus();
      input.showPicker?.(); // Modern browsers support this
      
      // Fallback for older browsers
      if (!input.showPicker) {
        input.click();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <GlassCard className={`transition-all ${isFocused ? 'ring-2 ring-primary/50' : ''}`}>
      <div className="relative">
        <div className="flex items-center gap-3 p-5 cursor-pointer" onClick={handleClick}>
          <div className="w-12 h-12 rounded-2xl gradient-purple flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Data</p>
            <p className="font-semibold text-base truncate capitalize">
              {formatDateDisplay(value)}
            </p>
          </div>
        </div>
        <input
          id={inputId}
          type="date"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          style={{
            WebkitAppearance: 'none',
            fontSize: '16px', // Prevent zoom on iOS
            zIndex: 10, // Ensure it's on top
          }}
        />
      </div>
    </GlassCard>
  );
}

