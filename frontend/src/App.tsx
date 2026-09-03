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
import { Sidebar } from "@/components/Sidebar";
import { DesktopHeader } from "@/components/DesktopHeader";
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
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

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
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white font-sans">
      {/* Sidebar for Desktop navigation */}
      <Sidebar onAddClick={openTransactionSheet} />

      {/* Main content page area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header with quick stats/sync details for desktop */}
        <DesktopHeader />

        <div className="page-container flex-1 overflow-hidden relative">
          <div className="scrollable-content h-full overflow-y-auto">
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
                path="/loans"
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
      </div>

      {/* Bottom Nav for mobile viewports */}
      <BottomNav onAddClick={openTransactionSheet} />

      {/* Global Bottom Sheets & Centered Modals */}
      <BottomSheet
        isOpen={isTransactionSheetOpen}
        onClose={closeTransactionSheet}
        title="Nuova Transazione"
      >
        <TransactionForm onSuccess={handleTransactionSuccess} />
      </BottomSheet>
    </div>
  );
}

const App = () => {
  const { isAuthenticated, isLoaded } = useAuth();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Initialize cache on app start if user is logged in
    const initializeCache = async () => {
      const shouldInit = isAuthenticated || !isOnline;

      if (!shouldInit) return;
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
          preloadCache().catch(err => console.warn('Silent startup cache preload failed:', err));
        }
      } catch (error) {
        console.error('Cache initialization failed:', error);
      }
    };

    if (isLoaded || !isOnline) {
      initializeCache();
    }
  }, [isLoaded, isAuthenticated, isOnline]);

  // Periodic background cache refresh every 5 minutes (only when signed in and online)
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = setInterval(async () => {
      if (isOnline) {
        console.log('Running periodic background cache refresh...');
        try {
          await preloadCache();
        } catch (error) {
          console.error('Periodic background preload failed:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [isAuthenticated, isOnline]);

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
