import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./components/mobile-inputs.css";
// Inizializza il fix per la viewport su iOS - REMOVED (moved to useViewportHeight hook)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/auth">
      <App />
    </ClerkProvider>
  </StrictMode>
);
