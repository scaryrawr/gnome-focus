export type SignalTrackedObject<T> = T & {
  connectObject(...args: unknown[]): void;
  disconnectObject(...args: unknown[]): void;
};

export function signal_tracked<T>(object: T): SignalTrackedObject<T> {
  return object as SignalTrackedObject<T>;
}
