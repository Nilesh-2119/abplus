import { useEffect, useRef } from "react";
import { syncManager } from "@/services/sync";

/**
 * Custom hook to refetch active data automatically.
 * Implements Smart Polling: only requests if the tab is visible and focused.
 * Also hooks into SyncManager for WebSocket/SSE triggers.
 */
export function useIntervalRefetch(
  fetcher: () => void | Promise<void>,
  delay: number = 5000,
  enabled: boolean = true
) {
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Subscribe to real-time events from WebSocket/SSE/SyncManager
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = syncManager.subscribe(() => {
      Promise.resolve(fetcherRef.current()).catch((err) => {
        console.error("SyncManager refetch trigger failed:", err);
      });
    });

    return unsubscribe;
  }, [enabled]);

  // Set up smart polling interval
  useEffect(() => {
    if (!enabled || !delay) return;

    const handleInterval = () => {
      const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";
      const isFocused = typeof window !== "undefined" && window.document.hasFocus();

      if (isVisible && isFocused) {
        Promise.resolve(fetcherRef.current()).catch((err) => {
          console.error("Smart polling refetch failed:", err);
        });
      }
    };

    const timer = setInterval(handleInterval, delay);
    return () => clearInterval(timer);
  }, [delay, enabled]);
}
