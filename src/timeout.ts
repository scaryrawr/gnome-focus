const GLib = imports.gi.GLib;

export class Timeouts {
  /** IDs that have been created by the timeout */
  active: Set<number>;

  constructor() {
    this.active = new Set<number>();
  }

  add = (callback: () => boolean, interval = 0, priority = GLib.PRIORITY_DEFAULT): void => {
    let timeout_id: number | undefined = undefined;
    this.active.add(
      (timeout_id = GLib.timeout_add(priority, interval, (): boolean => {
        const result = callback();
        if (!result && timeout_id) {
          this.active.delete(timeout_id);
        }

        return result;
      }))
    );
  };

  clear = (): void => {
    this.active.forEach(id => {
      GLib.Source.remove(id);
    });

    this.active.clear();
  };
}
