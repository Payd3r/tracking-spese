import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Category } from "@/types/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const colorOptions = [
  { value: "gradient-blue", label: "Blu" },
  { value: "gradient-green", label: "Verde" },
  { value: "gradient-purple", label: "Viola" },
  { value: "gradient-pink", label: "Rosa" },
  { value: "gradient-teal", label: "Teal" },
  { value: "gradient-orange", label: "Arancione" },
];

export default function ManageCategories() {
  const [viewType, setViewType] = useState<"expense" | "income">("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("lucide:Tag");
  const [color, setColor] = useState("gradient-blue");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [viewType]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.categories.getAll(viewType);
      setCategories(response.data);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento delle categorie");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) {
      toast.error("Inserisci il nome della categoria");
      return;
    }

    try {
      setSubmitting(true);
      await api.categories.create({
        name,
        icon,
        color,
        type: viewType
      });

      toast.success("Categoria creata con successo!");
      setDialogOpen(false);
      setName("");
      setIcon("lucide:Tag");
      setColor("gradient-blue");
      loadCategories();
    } catch (err: any) {
      console.error("Failed to create category:", err);
      toast.error(err.response?.data?.message || "Errore nella creazione della categoria");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      await api.categories.delete(categoryToDelete);
      toast.success("Categoria eliminata con successo!");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      loadCategories();
    } catch (err: any) {
      console.error("Failed to delete category:", err);
      toast.error(err.response?.data?.message || "Errore nell'eliminazione della categoria");
    }
  };
  
  const filteredCategories = categories.filter(c => !c.isSystem);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Gestione Categorie</h1>
      </div>

      {/* Toggle */}
      <GlassCard className="p-2 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewType("expense")}
            className={`flex-1 py-2 rounded-xl text-sm transition-all ${
              viewType === "expense" ? "gradient-blue text-white" : "text-muted-foreground"
            }`}
          >
            Uscite
          </button>
          <button
            onClick={() => setViewType("income")}
            className={`flex-1 py-2 rounded-xl text-sm transition-all ${
              viewType === "income" ? "gradient-blue text-white" : "text-muted-foreground"
            }`}
          >
            Entrate
          </button>
        </div>
      </GlassCard>

      {/* Add Category Button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full mb-6 gap-2">
            <Plus className="w-5 h-5" />
            Aggiungi Categoria
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Ristorante"
              />
            </div>
            <div>
              <Label htmlFor="icon">Icona (Lucide)</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Es: lucide:Utensils"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formato: lucide:NomeIcona (es: lucide:Utensils, lucide:ShoppingCart)
              </p>
            </div>
            <div>
              <Label htmlFor="color">Colore</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creazione...
                </>
              ) : (
                "Crea Categoria"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Categories Grid */}
      {filteredCategories.length === 0 ? (
        <GlassCard className="p-6 text-center">
          <p className="text-muted-foreground">Nessuna categoria personalizzata</p>
          <p className="text-xs text-muted-foreground mt-2">
            Le categorie di sistema non possono essere eliminate
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredCategories.map((category) => (
            <GlassCard key={category.id} className={`p-5 ${category.color || 'gradient-blue'} relative group`}>
              <button
                onClick={() => {
                  setCategoryToDelete(category.id);
                  setDeleteDialogOpen(true);
                }}
                className="absolute top-3 right-3 p-1.5 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
              <div className="mb-4">
                <IconRenderer icon={category.icon} size={40} className="text-white" />
              </div>
              <h3 className="text-white font-semibold">{category.name}</h3>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa categoria? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
