import { useState, useEffect } from 'react';

/**
 * Hook detecting if the virtual keyboard is open.
 * Takes into account Visual Viewport API for iOS support.
 */
export const useKeyboardOpen = () => {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        // Check if VisualViewport API is supported
        if (!window.visualViewport) {
            return;
        }

        const handleResize = () => {
            // If the visual viewport is significantly smaller than the window height,
            // it's a strong indicator the keyboard is open on mobile.
            const isHeightReduced = window.visualViewport!.height < window.innerHeight * 0.75;

            // Also check if an input field is focused to be sure
            const activeTag = document.activeElement?.tagName.toLowerCase();
            const isInputFocused = activeTag === 'input' || activeTag === 'textarea';

            setIsKeyboardOpen(isHeightReduced && isInputFocused);
        };

        const handleFocusOut = () => {
            // When focus leaves, give a small delay to see if another input gets focus
            // or if the keyboard is truly closing
            setTimeout(() => {
                if (document.activeElement?.tagName.toLowerCase() !== 'input' &&
                    document.activeElement?.tagName.toLowerCase() !== 'textarea') {
                    // Double check viewport just in case
                    if (window.visualViewport!.height >= window.innerHeight * 0.9) {
                        setIsKeyboardOpen(false);
                        // Force reflow to fix iOS position:fixed bug after keyboard closes
                        forceReflow();
                    }
                }
            }, 100);
        };

        const forceReflow = () => {
            // Force browser to recalculate layout by reading offsetHeight
            document.body.offsetHeight;
            
            // Force repaint of bottom nav by toggling display
            const nav = document.querySelector('.ios-bottom-nav') as HTMLElement;
            if (nav) {
                const originalDisplay = nav.style.display;
                nav.style.display = 'none';
                // Force reflow
                nav.offsetHeight;
                nav.style.display = originalDisplay || '';
            }
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize); // Sometimes scroll happens on open
        document.addEventListener('focusout', handleFocusOut);

        // Initial check
        handleResize();

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
            document.removeEventListener('focusout', handleFocusOut);
        };
    }, []);

    return isKeyboardOpen;
};
