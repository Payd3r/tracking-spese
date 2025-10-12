import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./components/mobile-inputs.css";
import { initViewportFix } from "./utils/viewport";

// Inizializza il fix per la viewport su iOS
initViewportFix();

createRoot(document.getElementById("root")!).render(<App />);
