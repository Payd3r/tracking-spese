/**
 * Utility per gestire i colori delle categorie
 * Supporta sia colori esadecimali (#ef4444) che classi CSS gradient (gradient-blue)
 */

export interface CategoryStyle {
  className: string;
  style?: React.CSSProperties;
}

/**
 * Determina se applicare un colore come classe CSS o come style inline
 * @param color - Il colore della categoria (esadecimale o classe CSS)
 * @param isSelected - Se la categoria è selezionata
 * @returns Oggetto con className e style da applicare
 */
export const getCategoryStyle = (color: string | undefined, isSelected: boolean): CategoryStyle => {
  if (!isSelected) {
    return { className: "glass-card", style: undefined };
  }
  
  if (!color) {
    return { className: "gradient-blue", style: undefined };
  }
  
  // Se il colore inizia con #, è un esadecimale
  if (color.startsWith('#')) {
    return { 
      className: "", 
      style: { background: color }
    };
  }
  
  // Altrimenti è una classe CSS gradient
  return { className: color, style: undefined };
};
