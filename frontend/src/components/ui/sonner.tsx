import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset={16}
      duration={3000}
      gap={12}
      icons={{
        success: <CheckCircle2 className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast sonner-toast group-[.toaster]:bg-card/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_8px_32px_hsl(0_0%_0%/_0.4)] group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-muted-foreground/90",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5",
          success: "group-[.toaster]:border-success/30 group-[.toaster]:bg-success/10 group-[.toaster]:text-success-foreground",
          error: "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive-foreground",
          warning: "group-[.toaster]:border-warning/30 group-[.toaster]:bg-warning/10 group-[.toaster]:text-warning-foreground",
          info: "group-[.toaster]:border-primary/30 group-[.toaster]:bg-primary/10 group-[.toaster]:text-primary-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
