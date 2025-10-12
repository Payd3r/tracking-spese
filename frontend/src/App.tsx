import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomSheetProvider, useBottomSheet } from "@/contexts/BottomSheetContext";
import { BottomSheet } from "@/components/BottomSheet";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { useEffect } from "react";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import ManageAccounts from "./pages/ManageAccounts";
import ManageCategories from "./pages/ManageCategories";
import ManageTransfers from "./pages/ManageTransfers";
import Profile from "./pages/Profile";
import TransactionDetail from "./pages/TransactionDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { isTransactionSheetOpen, openTransactionSheet, closeTransactionSheet } = useBottomSheet();


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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <BottomSheetProvider>
            <AppContent />
          </BottomSheetProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
