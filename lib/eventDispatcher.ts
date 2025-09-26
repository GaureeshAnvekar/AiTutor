type EventCallback = (data: any) => void;

class EventDispatcher {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  dispatch(event: string, data: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Clear all listeners for a specific event
  clear(event: string) {
    this.events.delete(event);
  }

  // Clear all listeners
  clearAll() {
    this.events.clear();
  }
}

export const eventDispatcher = new EventDispatcher();

// Event types for better type safety
export const EVENTS = {
  CHAT_METADATA_RECEIVED: 'CHAT_METADATA_RECEIVED',
  PDF_PAGE_CHANGED: 'PDF_PAGE_CHANGED',
  PDF_VIEWER_READY: 'PDF_VIEWER_READY',
} as const;

export type EventType = typeof EVENTS[keyof typeof EVENTS];
