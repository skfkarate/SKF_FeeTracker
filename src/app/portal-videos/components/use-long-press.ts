"use client";

import { useCallback, useRef } from "react";

const LONG_PRESS_MS = 480;
const MOVE_TOLERANCE_PX = 12;

export function useLongPress(onLongPress: (x: number, y: number) => void) {
  const timerRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length !== 1) return;
      firedRef.current = false;
      const touch = event.touches[0];
      originRef.current = { x: touch.clientX, y: touch.clientY };
      clear();
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
        onLongPress(originRef.current.x, originRef.current.y);
      }, LONG_PRESS_MS);
    },
    [clear, onLongPress],
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const dx = Math.abs(touch.clientX - originRef.current.x);
      const dy = Math.abs(touch.clientY - originRef.current.y);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) clear();
    },
    [clear],
  );

  const onTouchEnd = useCallback(() => clear(), [clear]);

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd };
}

export function contextMenuHandlers(onOpen: (x: number, y: number) => void) {
  return {
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      onOpen(event.clientX, event.clientY);
    },
  };
}
