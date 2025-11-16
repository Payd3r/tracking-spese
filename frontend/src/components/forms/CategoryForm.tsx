import { GlassCard } from "@/components/GlassCard";
import { TextInput } from "@/components/TextInput";
import { IconSelector } from "@/components/IconSelector";
import { ColorSelector } from "@/components/ColorSelector";
import { Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface CategoryFormProps {
  onSuccess: () => void;
  initialType?: "income" | "expense";
}

export function CategoryForm({ onSuccess, initialType = "expense" }: CategoryFormProps) {
  const [type, setType] = useState<"income" | "expense">(initialType);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("lucide:Tag");
  const [color, setColor] = useState("gradient-blue");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Inserisci il nome della categoria");
      return;
    }

    try {
      setSubmitting(true);
      await api.categories.create({
        name: name.trim(),
        icon,
        color,
        type
      });

      toast.success("Categoria creata con successo!");
      
      // Reset form
      setName("");
      setIcon("lucide:Tag");
      setColor("gradient-blue");
      
      onSuccess();
    } catch (err: any) {
      console.error("Failed to create category:", err);
      toast.error(err.response?.data?.message || "Errore nella creazione della categoria");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Type Selector */}
      <GlassCard className="p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setType("expense")}
            className={`flex-1 py-2 rounded-xl text-sm transition-all interactive-press ${
              type === "expense" ? "pill-active font-medium" : "text-muted-foreground"
            }`}
          >
            Uscita
          </button>
          <button
            onClick={() => setType("income")}
            className={`flex-1 py-2 rounded-xl text-sm transition-all interactive-press ${
              type === "income" ? "pill-active font-medium" : "text-muted-foreground"
            }`}
          >
            Entrata
          </button>
        </div>
      </GlassCard>

      {/* Name Input */}
      <TextInput
        value={name}
        onChange={setName}
        placeholder="Es: Ristorante, Shopping..."
        icon={Tag}
        label="Nome Categoria"
        maxLength={50}
      />

      {/* Icon Selector */}
      <IconSelector
        selectedIcon={icon}
        onSelect={setIcon}
        iconSet="category"
      />

      {/* Color Selector */}
      <ColorSelector
        selectedColor={color}
        onSelect={setColor}
      />

      {/* Submit Button */}
      <Button 
        onClick={handleCreate} 
        disabled={submitting}
        className="w-full h-12 rounded-2xl font-semibold pill-active"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Creazione...
          </>
        ) : (
          "Crea Categoria"
        )}
      </Button>
    </div>
  );
}

