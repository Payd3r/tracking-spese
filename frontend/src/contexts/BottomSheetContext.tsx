import { createContext, useContext, useState, ReactNode } from "react";

interface BottomSheetContextType {
  isTransactionSheetOpen: boolean;
  openTransactionSheet: () => void;
  closeTransactionSheet: () => void;
}

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(undefined);

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const [isTransactionSheetOpen, setIsTransactionSheetOpen] = useState(false);

  const openTransactionSheet = () => setIsTransactionSheetOpen(true);
  const closeTransactionSheet = () => setIsTransactionSheetOpen(false);

  return (
    <BottomSheetContext.Provider
      value={{
        isTransactionSheetOpen,
        openTransactionSheet,
        closeTransactionSheet,
      }}
    >
      {children}
    </BottomSheetContext.Provider>
  );
}

export function useBottomSheet() {
  const context = useContext(BottomSheetContext);
  if (context === undefined) {
    throw new Error("useBottomSheet must be used within a BottomSheetProvider");
  }
  return context;
}


