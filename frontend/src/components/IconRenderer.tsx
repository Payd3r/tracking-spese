import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface IconRendererProps {
  icon?: string;
  className?: string;
  size?: number;
}

/**
 * Renders a Lucide icon based on a string like "lucide:Wallet"
 * Falls back to a default icon if the icon is not found
 */
export function IconRenderer({ icon, className = '', size = 24 }: IconRendererProps) {
  const glowClassName = 'drop-shadow-[0_0_8px_hsl(0_0%_100%/_0.6)]';
  const combinedClassName = `${glowClassName} ${className}`.trim();
  
  if (!icon) {
    return <LucideIcons.HelpCircle className={combinedClassName} size={size} />;
  }

  // Check if it's a lucide icon
  if (icon.startsWith('lucide:')) {
    const iconName = icon.replace('lucide:', '');
    
    // Get the icon component from Lucide
    const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
    
    if (IconComponent) {
      return <IconComponent className={combinedClassName} size={size} />;
    }
  }

  // Fallback to displaying the string (for backward compatibility with emoji)
  return <span className={combinedClassName} style={{ fontSize: `${size}px` }}>{icon}</span>;
}

