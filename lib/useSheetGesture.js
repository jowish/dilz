import { useRef } from 'react';
import { shouldDismissSheet } from './sheetGesture';

export function useSheetGesture(onClose) {
  const panelRef = useRef(null);
  const gestureRef = useRef(null);

  const resetPanel = () => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transition = 'transform 180ms ease';
    panel.style.transform = 'translateY(0)';
    window.setTimeout(() => { if (panelRef.current) panelRef.current.style.transition = ''; }, 190);
  };

  const finish = (event, cancelled = false) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gestureRef.current = null;
    const distance = Math.max(0, event.clientY - gesture.startY);
    const elapsed = Math.max(1, performance.now() - gesture.startedAt);
    const velocity = distance / elapsed;
    const panel = panelRef.current;

    if (!cancelled && shouldDismissSheet(distance, velocity)) {
      if (panel) {
        panel.style.transition = 'transform 180ms ease';
        panel.style.transform = 'translateY(105%)';
      }
      window.setTimeout(onClose, 160);
      return;
    }
    resetPanel();
  };

  const handleProps = {
    onPointerDown: (event) => {
      gestureRef.current = { startY: event.clientY, startedAt: performance.now() };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      if (panelRef.current) panelRef.current.style.transition = 'none';
    },
    onPointerMove: (event) => {
      if (!gestureRef.current || !panelRef.current) return;
      const distance = Math.max(0, event.clientY - gestureRef.current.startY);
      panelRef.current.style.transform = `translateY(${distance}px)`;
    },
    onPointerUp: (event) => finish(event),
    onPointerCancel: (event) => finish(event, true),
  };

  return { panelRef, handleProps };
}
