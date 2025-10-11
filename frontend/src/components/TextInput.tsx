import { GlassCard } from "./GlassCard";
import { LucideIcon } from "lucide-react";
import { useState } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon: LucideIcon;
  label: string;
  maxLength?: number;
}

export function TextInput({ 
  value, 
  onChange, 
  placeholder = "", 
  icon: Icon, 
  label,
  maxLength 
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <GlassCard className={`transition-all ${isFocused ? 'ring-2 ring-primary/50' : ''}`}>
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-2xl gradient-blue flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-xs text-muted-foreground mb-1 block font-medium">
            {label}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/50"
            style={{
              WebkitAppearance: 'none',
            }}
          />
        </div>
      </div>
    </GlassCard>
  );
}

