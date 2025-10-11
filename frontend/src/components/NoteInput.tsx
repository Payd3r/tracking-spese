import { GlassCard } from "./GlassCard";
import { useState } from "react";

interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function NoteInput({ value, onChange, placeholder = "Note..." }: NoteInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <GlassCard className={`transition-all ${isFocused ? 'ring-2 ring-primary/50' : ''}`}>
      <div className="flex items-start gap-2.5 p-4">
        <div className="flex-1 min-w-0">
          <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
            Nota (opzionale)
          </label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            rows={2}
            className="w-full bg-transparent border-none outline-none resize-none text-sm placeholder:text-muted-foreground/50"
            style={{
              WebkitAppearance: 'none',
            }}
          />
        </div>
      </div>
    </GlassCard>
  );
}

