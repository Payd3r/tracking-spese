import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground px-4">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold tracking-tight">404</div>
        <p className="text-lg text-muted-foreground">Oops! Pagina non trovata</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold interactive-press"
        >
          Torna alla Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
