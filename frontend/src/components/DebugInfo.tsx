import { useState, useEffect } from 'react';

export const DebugInfo = () => {
  const [debugInfo, setDebugInfo] = useState({
    windowWidth: 0,
    windowHeight: 0,
    documentWidth: 0,
    documentHeight: 0,
    bodyHeight: 0,
    rootHeight: 0,
    safeAreaTop: 0,
    safeAreaBottom: 0,
    safeAreaLeft: 0,
    safeAreaRight: 0,
    viewportHeight: 0,
    screenHeight: 0,
  });

  useEffect(() => {
    const updateDebugInfo = () => {
      const computedStyle = getComputedStyle(document.body);
      
      setDebugInfo({
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        documentWidth: document.documentElement.clientWidth,
        documentHeight: document.documentElement.clientHeight,
        bodyHeight: document.body.offsetHeight,
        rootHeight: document.getElementById('root')?.offsetHeight || 0,
        safeAreaTop: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0'),
        safeAreaBottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        safeAreaLeft: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0'),
        safeAreaRight: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0'),
        viewportHeight: window.visualViewport?.height || window.innerHeight,
        screenHeight: window.screen.height,
      });
    };

    updateDebugInfo();
    
    const handleResize = () => updateDebugInfo();
    const handleOrientationChange = () => setTimeout(updateDebugInfo, 100);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] bg-black/80 text-white text-xs p-3 rounded-lg font-mono">
      <div className="grid grid-cols-2 gap-1">
        <div>Window: {debugInfo.windowWidth}x{debugInfo.windowHeight}</div>
        <div>Document: {debugInfo.documentWidth}x{debugInfo.documentHeight}</div>
        <div>Body Height: {debugInfo.bodyHeight}px</div>
        <div>Root Height: {debugInfo.rootHeight}px</div>
        <div>Screen Height: {debugInfo.screenHeight}px</div>
        <div>Viewport Height: {debugInfo.viewportHeight}px</div>
        <div>Safe Top: {debugInfo.safeAreaTop}px</div>
        <div>Safe Bottom: {debugInfo.safeAreaBottom}px</div>
        <div>Safe Left: {debugInfo.safeAreaLeft}px</div>
        <div>Safe Right: {debugInfo.safeAreaRight}px</div>
        <div>100vh: {debugInfo.windowHeight}px</div>
        <div>100dvh: {debugInfo.viewportHeight}px</div>
        <div data-debug-viewport>--vh: loading...</div>
      </div>
      <div className="mt-2 text-warning">
        Diff: {debugInfo.screenHeight - debugInfo.windowHeight}px
      </div>
    </div>
  );
};
