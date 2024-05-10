// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnknownFunction = (...args: any[]) => unknown;

export class EventEmitter {
  private events: { [eventName: string]: UnknownFunction[] };

  constructor() {
    this.events = {};
  }

  public on(eventName: string, listener: UnknownFunction): void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push(listener);
  }

  public once(eventName: string, listener: UnknownFunction): void {
    const once_listener: UnknownFunction = (...args) => {
      this.off(eventName, once_listener);
      return listener(...args);
    };

    this.on(eventName, once_listener);
  }

  public off(eventName: string, listener: UnknownFunction): void {
    const listeners = this.events[eventName];
    if (listeners) {
      this.events[eventName] = listeners.filter(l => l !== listener);
    }
  }

  public emit(eventName: string, ...args: unknown[]): boolean {
    const listeners = this.events[eventName];
    if (!listeners) {
      return false;
    }

    listeners.forEach(listener => listener(...args));
    return true;
  }

  public removeAllListeners(eventName?: string): void {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }
  }
}
