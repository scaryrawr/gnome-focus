export type SafeEmitter<T extends Record<string, unknown[]>> = {
  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void;
  emit<K extends keyof T>(event: K, ...args: T[K]): boolean;
  off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): void;
};
