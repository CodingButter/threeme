export type Listener = (...args: any[]) => void;

export abstract class EventManager {
  private listeners: Map<string, Listener[]> = new Map();

  public addEventListener(event: string, listener: Listener): void {
    const listeners = this.listeners.get(event) || [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  public removeEventListener(event: string, listener: Listener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      this.listeners.set(
        event,
        listeners.filter((l) => l !== listener)
      );
    }
  }

  public emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    listeners?.forEach((listener) => listener(...args));
  }
}
