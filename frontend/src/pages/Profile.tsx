import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Download, Upload, User, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Profile() {
  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/settings" className="p-2 glass-card rounded-2xl">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Profilo</h1>
      </div>

      {/* Profile Info */}
      <GlassCard className="p-6 mb-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full gradient-purple flex items-center justify-center text-4xl font-bold mb-4">
            M
          </div>
          <h2 className="text-2xl font-bold">Mark Johnson</h2>
          <p className="text-muted-foreground">mark@example.com</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium">Mark Johnson</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">mark@example.com</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Backup Section */}
      <GlassCard className="p-6">
        <h3 className="font-semibold mb-4">Backup Dati</h3>
        <div className="space-y-3">
          <Button className="w-full gap-2" variant="outline">
            <Upload className="w-4 h-4" />
            Importa Backup
          </Button>
          <Button className="w-full gap-2" variant="outline">
            <Download className="w-4 h-4" />
            Esporta Backup
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
