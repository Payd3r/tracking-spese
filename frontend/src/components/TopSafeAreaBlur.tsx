import React from "react";

export const TopSafeAreaBlur: React.FC = () => {
  return (
    <div
      className="top-safe-area-blur pointer-events-none fixed top-0 left-0 right-0 z-40 md:hidden"
      aria-hidden="true"
    >
      {/* Progressive Blur Layer 1 (Broadest reach, ultra-fine blur) */}
      <div className="blur-layer blur-layer-1" />
      
      {/* Progressive Blur Layer 2 (Fine blur) */}
      <div className="blur-layer blur-layer-2" />
      
      {/* Progressive Blur Layer 3 (Medium blur) */}
      <div className="blur-layer blur-layer-3" />
      
      {/* Progressive Blur Layer 4 (Deep blur) */}
      <div className="blur-layer blur-layer-4" />
      
      {/* Progressive Blur Layer 5 (Maximum blur inside notch/island area) */}
      <div className="blur-layer blur-layer-5" />
      
      {/* Tint Gradient Overlay: from 70% dark at top to 0% transparent at bottom */}
      <div className="blur-tint-overlay" />
    </div>
  );
};
