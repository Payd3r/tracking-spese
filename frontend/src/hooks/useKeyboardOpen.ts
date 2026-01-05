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
                const activeTag = document.activeElement?.tagName.toLowerCase();
                const hasInputFocus = activeTag === 'input' || activeTag === 'textarea';

                if (!hasInputFocus && window.visualViewport!.height >= window.innerHeight * 0.9) {
                    setIsKeyboardOpen(false);

                    // Refresh the stable height var so the layout re-expands after keyboard close
                    const fullHeight = Math.max(window.innerHeight, window.visualViewport!.height);
                    document.documentElement.style.setProperty('--app-height', `${fullHeight}px`);
                    requestAnimationFrame(() => {
                        document.documentElement.style.setProperty('--app-height', `${fullHeight}px`);
                    });
                }
            }, 120);
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
