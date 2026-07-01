import { useEffect } from "react";
export function useWakeLock(enabled) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let lock = null;
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request("screen"); } catch {}
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release();
    };
  }, [enabled]);
}
