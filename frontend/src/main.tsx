import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./components/mobile-inputs.css";
import { initViewportFix } from "./utils/viewport";
import { ClerkProvider } from "@clerk/clerk-react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key (VITE_CLERK_PUBLISHABLE_KEY)");
}

// Inizializza il fix per la viewport su iOS
initViewportFix();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/auth">
      <App />
    </ClerkProvider>
  </StrictMode>
);
