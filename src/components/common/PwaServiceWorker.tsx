"use client";

import { useEffect } from "react";

export default function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const isSecureContext = window.isSecureContext || window.location.hostname === "localhost";
    if (!isSecureContext) return;

    const timeoutId = window.setTimeout(() => {
      navigator.serviceWorker.register("/feetrack-sw.js").catch(() => null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
}
