import { GlassCard } from "@/components/GlassCard";
import { IconRenderer } from "@/components/IconRenderer";
import { VerticalProgressBar } from "@/components/VerticalProgressBar";
import { BottomSheet } from "@/components/BottomSheet";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CardListSkeleton } from "@/components/skeletons/CardListSkeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Category } from "@/types/api";
import { toast } from "sonner";
import { useSync } from "@/contexts/SyncContext";
import { db } from "@/lib/db";
import { useBottomNavPadding } from "@/hooks/useBottomNavPadding";
import { sortCategoriesByUsage } from "@/lib/cacheManager";
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

interface CategoryWithStats extends Category {
  total: number;
  percentage: number;
}

export default function ManageCategories() {
  const { isFullyOnline } = useSync();
  const { ref, style } = useBottomNavPadding();
  const [viewType, setViewType] = useState<"expense" | "income">("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryWithStats[]>([]);
  const [totalForType, setTotalForType] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  useEffect(() => {
    loadCategories();
    loadCategoryStats();
  }, [viewType]);

  const loadCategories = async () => {
    try {
      // SEMPRE caricare dalla cache prima
      const cachedCategories = await db.cachedCategories
        .where('type')
        .equals(viewType)
        .toArray();

      // Mostrare subito i dati dalla cache
      setCategories(sortCategoriesByUsage(cachedCategories));

      // POI, se online E server raggiungibile, aggiornare in background
      if (isFullyOnline) {
        try {
          const response = await api.categories.getAll(viewType);
          const categoriesData = sortCategoriesByUsage(Array.isArray(response.data.categories) ? response.data.categories : []);

          // Aggiornare cache
          await db.cachedCategories.bulkPut(categoriesData);

          // Aggiornare stato con dati freschi
          setCategories(categoriesData);
        } catch (err) {
          // Ignorare errori di rete - abbiamo già i dati dalla cache
          console.log("Background refresh failed, using cached data");
        }
      }
    } catch (err: any) {
      console.error("Failed to load categories:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento delle categorie");
      setCategories([]);
    }
  };

  const loadCategoryStats = async () => {
    try {
      setLoading(true);
      const response = await api.stats.getCategoryStats(viewType);
      setCategoryStats(response.data.categories || []);
      setTotalForType(response.data.total || 0);
    } catch (err: any) {
      console.error("Failed to load category stats:", err);
      toast.error(err.response?.data?.message || "Errore nel caricamento delle statistiche");
      setCategoryStats([]);
      setTotalForType(0);
    } finally {
      setLoading(false);
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
      loadCategoryStats();
    } catch (err: any) {
      console.error("Failed to delete category:", err);
      toast.error(err.response?.data?.message || "Errore nell'eliminazione della categoria");
    }
  };

  const handleCategoryCreated = () => {
    setCreateSheetOpen(false);
    loadCategories();
    loadCategoryStats();
  };

  const filteredCategories = categories.filter(c => !c.isSystem);

  return (
    <div ref={ref} style={style} className="px-3 pt-4 pb-28 max-w-md mx-auto md:max-w-5xl md:px-8 md:py-8">
      {/* Mobile-only Header */}
      <div className="flex items-center gap-3 mb-5 md:hidden">
        <Link to="/settings" className="p-1.5 glass-card rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Gestione Categorie</h1>
      </div>

      {/* Control Bar (Toggle & Add Button) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Toggle Income/Expense */}
        <div className="p-1 bg-white/5 border border-white/10 rounded-2xl flex gap-1 w-full sm:w-[220px] shrink-0">
          <button
            onClick={() => setViewType("expense")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all interactive-press ${viewType === "expense" ? "pill-active" : "text-muted-foreground"}`}
          >
            Uscite
          </button>
          <button
            onClick={() => setViewType("income")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all interactive-press ${viewType === "income" ? "pill-active" : "text-muted-foreground"}`}
          >
            Entrate
          </button>
        </div>

        {/* Add Button */}
        <Button
          onClick={() => setCreateSheetOpen(true)}
          className="gap-2 h-10 px-5 sm:w-auto w-full font-semibold shrink-0 shadow-strong pill-active"
        >
          <Plus className="w-4 h-4" />
          Aggiungi Categoria
        </Button>
      </div>

      {/* Categories Grid */}
      {loading && filteredCategories.length === 0 ? (
        <CardListSkeleton variant="grid" />
      ) : filteredCategories.length === 0 ? (
        <div className="mb-4">
          <GlassCard className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Nessuna categoria personalizzata</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Le categorie di sistema predefinite non possono essere eliminate o modificate.
            </p>
          </GlassCard>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6">
          {filteredCategories.map((category) => {
            const stats = categoryStats.find(stat => stat.id === category.id);
            const total = stats?.total || 0;
            const percentage = stats?.percentage || 0;

            return (
              <GlassCard key={category.id} className={`p-3 h-28 ${category.color || 'gradient-blue'} relative group overflow-hidden border border-white/5 transition-colors`}>
                {/* Custom Delete button */}
                <button
                  onClick={() => {
                    setCategoryToDelete(category.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/35 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                </button>

                <div className="flex items-stretch gap-2 h-full">
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="text-white font-bold text-xs md:text-sm mb-0.5 truncate leading-tight">{category.name}</h3>
                      <div className="text-white/70 text-[10px] truncate">
                        {loading && !categoryStats.length ? (
                          <Skeleton className="h-3 w-10 bg-white/20" />
                        ) : (
                          <> {viewType === 'expense' ? 'usato' : 'ricevuto'} {percentage}% </>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <IconRenderer icon={category.icon} size={28} className="text-white/60" />
                    </div>
                  </div>

                  <VerticalProgressBar percentage={percentage} className="h-full w-1 shrink-0" />
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Sei sicuro di voler eliminare questa categoria? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="m-0 text-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="m-0 text-sm pill-active">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Category Bottom Sheet / Widescreen Modal */}
      <BottomSheet
        isOpen={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        title="Nuova Categoria"
      >
        <CategoryForm onSuccess={handleCategoryCreated} initialType={viewType} />
      </BottomSheet>
    </div>
  );
}
