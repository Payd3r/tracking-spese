import { useEffect } from 'react';

/**
 * Hook that tracks the Visual Viewport height and sets it as a CSS custom property.
 * This is crucial for iOS PWA to properly anchor fixed elements after keyboard interactions.
 * 
 * iOS Safari has a bug where position:fixed breaks after keyboard open/close.
 * By tracking the actual visual viewport height and using it in CSS, we can work around this.
 */
export const useVisualViewportHeight = () => {
  useEffect(() => {
    // Check if VisualViewport API is supported
    if (!window.visualViewport) {
      return;
    }

    const setViewportHeight = () => {
      const vh = window.visualViewport!.height;
      document.documentElement.style.setProperty('--visual-vh', `${vh}px`);
    };

    // Set initial value
    setViewportHeight();

    // Update on resize and scroll (keyboard open/close triggers these)
    window.visualViewport.addEventListener('resize', setViewportHeight);
    window.visualViewport.addEventListener('scroll', setViewportHeight);

    return () => {
      window.visualViewport?.removeEventListener('resize', setViewportHeight);
      window.visualViewport?.removeEventListener('scroll', setViewportHeight);
    };
  }, []);
};
