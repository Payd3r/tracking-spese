import { GlassCard } from "./GlassCard";

const colorOptions = [
  { value: "gradient-blue", label: "Blu" },
  { value: "gradient-green", label: "Verde" },
  { value: "gradient-purple", label: "Viola" },
  { value: "gradient-pink", label: "Rosa" },
  { value: "gradient-teal", label: "Teal" },
  { value: "gradient-orange", label: "Arancione" },
];

interface ColorSelectorProps {
  selectedColor: string;
  onSelect: (color: string) => void;
}

export function ColorSelector({ selectedColor, onSelect }: ColorSelectorProps) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-3 block font-medium">
        Seleziona Colore
      </label>
      <GlassCard className="p-3">
        <div className="grid grid-cols-6 gap-2">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() => onSelect(color.value)}
              className={`relative flex items-center justify-center p-2 rounded-xl transition-all ${
                selectedColor === color.value 
                  ? "ring-2 ring-white/50" 
                  : "hover:bg-white/5"
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${color.value} ${
                selectedColor === color.value 
                  ? "ring-2 ring-white/30" 
                  : ""
              }`} />
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

