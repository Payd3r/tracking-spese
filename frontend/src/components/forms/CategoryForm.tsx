import { GlassCard } from "@/components/GlassCard";
import { TextInput } from "@/components/TextInput";
import { IconSelector } from "@/components/IconSelector";
import { ColorSelector } from "@/components/ColorSelector";
import { BottomSheet } from "@/components/BottomSheet";
import { Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: "income" | "expense";
}

export function CategoryForm({
  isOpen,
  onClose,
  onSuccess,
  initialType = "expense",
}: CategoryFormProps) {
  const [type, setType] = useState<"income" | "expense">(initialType);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("lucide:Tag");
  const [color, setColor] = useState("gradient-blue");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
    }
  }, [isOpen, initialType]);

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
        type,
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
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      header={
        <div className="pb-3 border-b border-white/10 flex items-center">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-bold text-white tracking-tight">Nuova Categoria</h2>
          </div>
        </div>
      }
      footer={
        <Button
          onClick={handleCreate}
          disabled={submitting || !name.trim()}
          size="lg"
          className="w-full h-12 pill-active text-sm font-bold rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Creazione...
            </span>
          ) : (
            "Crea Categoria"
          )}
        </Button>
      }
    >
      <div className="py-4 space-y-4">
        {/* Type Selector */}
        <div className="p-1 bg-white/5 border border-white/10 rounded-2xl flex gap-1">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all interactive-press ${
              type === "expense" ? "pill-active" : "text-muted-foreground hover:text-white"
            }`}
          >
            Uscita
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all interactive-press ${
              type === "income" ? "pill-active" : "text-muted-foreground hover:text-white"
            }`}
          >
            Entrata
          </button>
        </div>

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
        <IconSelector selectedIcon={icon} onSelect={setIcon} iconSet="category" />

        {/* Color Selector */}
        <ColorSelector selectedColor={color} onSelect={setColor} />
      </div>
    </BottomSheet>
  );
}
