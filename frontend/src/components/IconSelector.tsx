import { GlassCard } from "./GlassCard";
import { IconRenderer } from "./IconRenderer";
import { Plus } from "lucide-react";
import React from "react";
import {
  ShoppingCart, Utensils, Car, Home, Coffee, Shirt, Gift, Heart,
  Music, Book, Briefcase, Plane, Film, Gamepad2, DollarSign, CreditCard,
  Wallet, Banknote, PiggyBank, Building, Landmark, Bitcoin, BadgeDollarSign,
  Tag, Pizza, Smartphone, Dumbbell, Pill, GraduationCap, Wrench,
  Camera, Laptop, Receipt, TrendingUp, Target, Star, Zap, Lightbulb,
  ShoppingBag, Tv, Headphones, Palette, Baby, Dog, Cat, TreePine,
  Sun, Moon, Cloud, CloudRain, Snowflake, Flame, Droplets, Wind,
  MapPin, Navigation, Clock, Calendar, Timer, Bell, Settings, Search
} from "lucide-react";

const categoryIcons = [
  // Generali
  { name: "lucide:Tag", component: Tag },
  { name: "lucide:Target", component: Target },
  { name: "lucide:Star", component: Star },
  { name: "lucide:Zap", component: Zap },
  { name: "lucide:Lightbulb", component: Lightbulb },
  { name: "lucide:Settings", component: Settings },
  { name: "lucide:Search", component: Search },
  
  // Cibo e Bevande
  { name: "lucide:Utensils", component: Utensils },
  { name: "lucide:Pizza", component: Pizza },
  { name: "lucide:Coffee", component: Coffee },
  { name: "lucide:ShoppingBag", component: ShoppingBag },
  { name: "lucide:ShoppingCart", component: ShoppingCart },
  
  // Casa e Famiglia
  { name: "lucide:Home", component: Home },
  { name: "lucide:Wrench", component: Wrench },
  { name: "lucide:Baby", component: Baby },
  { name: "lucide:Heart", component: Heart },
  { name: "lucide:Dog", component: Dog },
  { name: "lucide:Cat", component: Cat },
  
  // Trasporti
  { name: "lucide:Car", component: Car },
  { name: "lucide:Plane", component: Plane },
  { name: "lucide:MapPin", component: MapPin },
  { name: "lucide:Navigation", component: Navigation },
  
  // Salute e Fitness
  { name: "lucide:Heart", component: Heart },
  { name: "lucide:Pill", component: Pill },
  { name: "lucide:Dumbbell", component: Dumbbell },
  { name: "lucide:TreePine", component: TreePine },
  
  // Shopping e Tecnologia
  { name: "lucide:Shirt", component: Shirt },
  { name: "lucide:Smartphone", component: Smartphone },
  { name: "lucide:Laptop", component: Laptop },
  { name: "lucide:Camera", component: Camera },
  
  // Intrattenimento
  { name: "lucide:Music", component: Music },
  { name: "lucide:Headphones", component: Headphones },
  { name: "lucide:Film", component: Film },
  { name: "lucide:Tv", component: Tv },
  { name: "lucide:Gamepad2", component: Gamepad2 },
  { name: "lucide:Book", component: Book },
  { name: "lucide:Palette", component: Palette },
  
  // Finanze
  { name: "lucide:DollarSign", component: DollarSign },
  { name: "lucide:CreditCard", component: CreditCard },
  { name: "lucide:Wallet", component: Wallet },
  { name: "lucide:Receipt", component: Receipt },
  { name: "lucide:TrendingUp", component: TrendingUp },
  { name: "lucide:PiggyBank", component: PiggyBank },
  
  // Lavoro e Educazione
  { name: "lucide:Briefcase", component: Briefcase },
  { name: "lucide:GraduationCap", component: GraduationCap },
  
  // Regali e Occasioni
  { name: "lucide:Gift", component: Gift },
  
  // Natura e Tempo
  { name: "lucide:Sun", component: Sun },
  { name: "lucide:Moon", component: Moon },
  { name: "lucide:Cloud", component: Cloud },
  { name: "lucide:CloudRain", component: CloudRain },
  { name: "lucide:Snowflake", component: Snowflake },
  { name: "lucide:Flame", component: Flame },
  { name: "lucide:Droplets", component: Droplets },
  { name: "lucide:Wind", component: Wind },
  
  // Tempo e Date
  { name: "lucide:Clock", component: Clock },
  { name: "lucide:Calendar", component: Calendar },
  { name: "lucide:Timer", component: Timer },
  { name: "lucide:Bell", component: Bell },
];

const accountIcons = [
  { name: "lucide:Wallet", component: Wallet },
  { name: "lucide:CreditCard", component: CreditCard },
  { name: "lucide:Banknote", component: Banknote },
  { name: "lucide:PiggyBank", component: PiggyBank },
  { name: "lucide:Building", component: Building },
  { name: "lucide:Landmark", component: Landmark },
  { name: "lucide:Bitcoin", component: Bitcoin },
  { name: "lucide:BadgeDollarSign", component: BadgeDollarSign },
];

interface IconSelectorProps {
  selectedIcon: string;
  onSelect: (icon: string) => void;
  iconSet: "category" | "account";
}

export function IconSelector({ selectedIcon, onSelect, iconSet }: IconSelectorProps) {
  const icons = iconSet === "category" ? categoryIcons : accountIcons;
  const columns = iconSet === "category" ? 6 : 4;
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Per le categorie, mostra solo 17 icone (3 righe x 6 - 1 per il pulsante +) inizialmente
  const displayedIcons = iconSet === "category" && !isExpanded 
    ? icons.slice(0, 17) 
    : icons;

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-3 block font-medium">
        Seleziona Icona
      </label>
      <GlassCard className="p-3">
        <div className={`grid grid-cols-${columns} gap-2`}>
          {displayedIcons.map((icon) => (
            <button
              key={icon.name}
              onClick={() => onSelect(icon.name)}
              className={`p-3 rounded-xl transition-all flex items-center justify-center ${
                selectedIcon === icon.name 
                  ? "gradient-blue ring-2 ring-white/30" 
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <IconRenderer icon={icon.name} size={24} />
            </button>
          ))}
          
          {/* Pulsante + per espandere le categorie - sempre ultimo elemento */}
          {iconSet === "category" && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="p-3 rounded-xl transition-all flex items-center justify-center gradient-blue ring-2 ring-white/30"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

