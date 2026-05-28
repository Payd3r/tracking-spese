import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomSheetProvider, useBottomSheet } from "@/contexts/BottomSheetContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { BottomSheet } from "@/components/BottomSheet";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { useEffect } from "react";
import { preloadCache, hasCacheData } from "@/lib/cacheManager";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import ManageAccounts from "./pages/ManageAccounts";
import ManageCategories from "./pages/ManageCategories";
import ManageTransfers from "./pages/ManageTransfers";
import ManageLoans from "./pages/ManageLoans";
import AdminLoanCleanup from "./pages/AdminLoanCleanup";
import Profile from "./pages/Profile";
import TransactionDetail from "./pages/TransactionDetail";
import NotFound from "./pages/NotFound";
import { useAuth } from "@clerk/clerk-react";

const queryClient = new QueryClient();

function AppContent() {
  const { isTransactionSheetOpen, openTransactionSheet, closeTransactionSheet } = useBottomSheet();
  
  // Stabilize viewport height across keyboard open/close
  useViewportHeight();


  const handleTransactionSuccess = () => {
    closeTransactionSheet();
    // Small delay to ensure transaction is saved before reloading
    setTimeout(() => {
      window.dispatchEvent(new Event('transactionCreated'));
    }, 100);
  };

  return (
    <>
      <div className="page-container">
        <div className="scrollable-content">
          <Routes>
            {/* Public route */}
            <Route path="/auth" element={<Auth />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/accounts"
              element={
                <ProtectedRoute>
                  <ManageAccounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/categories"
              element={
                <ProtectedRoute>
                  <ManageCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/transfers"
              element={
                <ProtectedRoute>
                  <ManageTransfers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/loans"
              element={
                <ProtectedRoute>
                  <ManageLoans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/loans/cleanup"
              element={
                <ProtectedRoute>
                  <AdminLoanCleanup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transaction/:id"
              element={
                <ProtectedRoute>
                  <TransactionDetail />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
      <BottomNav onAddClick={openTransactionSheet} />

      {/* Global Bottom Sheets */}
      <BottomSheet
        isOpen={isTransactionSheetOpen}
        onClose={closeTransactionSheet}
      >
        <TransactionForm onSuccess={handleTransactionSuccess} />
      </BottomSheet>
    </>
  );
}

const App = () => {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    // Initialize cache on app start if user is logged in
    const initializeCache = async () => {
      if (!isSignedIn) return;
      try {
        const hasData = await hasCacheData();
        if (!hasData) {
          console.log('No cache data found, preloading...');
          const result = await preloadCache();
          if (result.success) {
            console.log('Cache preloaded successfully:', result);
          } else {
            console.error('Cache preload failed:', result.error);
          }
        } else {
          console.log('Cache data already available. Triggering silent background refresh...');
          // Esegue comunque un refresh silenzioso all'avvio se online
          preloadCache().catch(err => console.warn('Silent startup cache preload failed:', err));
        }
      } catch (error) {
        console.error('Cache initialization failed:', error);
      }
    };

    if (isLoaded) {
      initializeCache();
    }
  }, [isLoaded, isSignedIn]);

  // Periodic background cache refresh every 5 minutes (only when signed in and online)
  useEffect(() => {
    if (!isSignedIn) return;

    const intervalId = setInterval(async () => {
      if (navigator.onLine) {
        console.log('Running periodic background cache refresh...');
        try {
          await preloadCache();
        } catch (error) {
          console.error('Periodic background preload failed:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [isSignedIn]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <SyncProvider>
            <BottomSheetProvider>
              <AppContent />
            </BottomSheetProvider>
          </SyncProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
