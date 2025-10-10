import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import Home from "./pages/Home";
import AddTransaction from "./pages/AddTransaction";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import ManageAccounts from "./pages/ManageAccounts";
import ManageCategories from "./pages/ManageCategories";
import ManageTransfers from "./pages/ManageTransfers";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/accounts" element={<ManageAccounts />} />
            <Route path="/settings/categories" element={<ManageCategories />} />
            <Route path="/settings/transfers" element={<ManageTransfers />} />
            <Route path="/settings/profile" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
