class SyncManager {
  private listeners: Set<() => void> = new Set();
  private ws: WebSocket | null = null;

  /**
   * Subscribe to global sync events.
   * This is future-ready: when WebSocket/SSE connects, listeners will trigger.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Trigger a manual refresh across all mounted subscribers.
   * Can be invoked directly from user actions or WebSocket/SSE handlers.
   */
  triggerSync(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Error executing sync listener:", err);
      }
    });
  }

  /**
   * Future-ready WebSocket connection setup.
   * Enables seamless upgrading to push notifications.
   */
  connectWebSocket(url: string): void {
    if (this.ws) {
      this.ws.close();
    }
    try {
      this.ws = new WebSocket(url);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === "sync") {
            this.triggerSync();
          }
        } catch {
          this.triggerSync();
        }
      };
      this.ws.onclose = () => {
        // Simple reconnect logic can be added here
      };
    } catch (err) {
      console.error("Failed to connect to WebSocket:", err);
    }
  }
}

export const syncManager = new SyncManager();
