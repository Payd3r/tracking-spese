import { createContext, useContext, useState, ReactNode } from "react";

interface BottomSheetContextType {
  isTransactionSheetOpen: boolean;
  openTransactionSheet: () => void;
  closeTransactionSheet: () => void;
  selectedTransactionId: number | null;
  openTransactionDetail: (id: number) => void;
  closeTransactionDetail: () => void;
}

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(undefined);

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const [isTransactionSheetOpen, setIsTransactionSheetOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);

  const openTransactionSheet = () => setIsTransactionSheetOpen(true);
  const closeTransactionSheet = () => setIsTransactionSheetOpen(false);

  const openTransactionDetail = (id: number) => setSelectedTransactionId(id);
  const closeTransactionDetail = () => setSelectedTransactionId(null);

  return (
    <BottomSheetContext.Provider
      value={{
        isTransactionSheetOpen,
        openTransactionSheet,
        closeTransactionSheet,
        selectedTransactionId,
        openTransactionDetail,
        closeTransactionDetail,
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


