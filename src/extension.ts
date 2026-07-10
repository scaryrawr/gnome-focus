import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { load_config } from './config.js';
import { GnomeFocusManager, is_valid_window_type } from './GnomeFocusManager.js';

import { get_settings } from './settings.js';
import { signal_tracked } from './signals.js';

export default class GnomeFocus extends Extension {
  private config_cancellable: Gio.Cancellable | undefined;
  private extension_instance: GnomeFocusManager | undefined;
  private pending_window_actors: Set<Meta.WindowActor> | undefined;

  private focus_changed = (): void => {
    this.extension_instance?.refresh(this.pending_window_actors);
  };

  private window_created = (_display: Meta.Display, window: Meta.Window): void => {
    if (!is_valid_window_type(window)) {
      return;
    }

    const window_actor = window.get_compositor_private() as Meta.WindowActor | null;
    if (!window_actor || window_actor.is_destroyed()) {
      return;
    }

    this.pending_window_actors?.add(window_actor);
    signal_tracked(window_actor).connectObject(
      'first-frame',
      () => {
        signal_tracked(window_actor).disconnectObject(this);
        if (this.pending_window_actors?.delete(window_actor)) {
          this.extension_instance?.refresh(this.pending_window_actors);
        }
      },
      'destroy',
      () => {
        signal_tracked(window_actor).disconnectObject(this);
        this.pending_window_actors?.delete(window_actor);
      },
      this
    );
  };

  async enable() {
    const cancellable = new Gio.Cancellable();
    this.config_cancellable = cancellable;

    const [special_focus, ignore_focus] = await Promise.all([
      load_config<string[]>(this.metadata, 'special_focus.json', cancellable),
      load_config<string[]>(this.metadata, 'ignore_focus.json', cancellable)
    ]);

    if (this.config_cancellable !== cancellable || cancellable.is_cancelled()) {
      return;
    }
    this.config_cancellable = undefined;

    const settings = get_settings(this.getSettings());
    settings.normalize_excluded_windows();
    const pending_window_actors = new Set<Meta.WindowActor>();
    this.pending_window_actors = pending_window_actors;
    this.extension_instance = new GnomeFocusManager(
      settings,
      special_focus,
      ignore_focus,
      pending_window_actors
    );

    signal_tracked(global.display).connectObject(
      'notify::focus-window',
      this.focus_changed,
      'window-created',
      this.window_created,
      this
    );

    this.extension_instance.refresh();
  }

  disable() {
    this.config_cancellable?.cancel();
    this.config_cancellable = undefined;

    signal_tracked(global.display).disconnectObject(this);

    for (const window_actor of this.pending_window_actors ?? []) {
      signal_tracked(window_actor).disconnectObject(this);
    }
    this.pending_window_actors?.clear();
    this.pending_window_actors = undefined;

    if (this.extension_instance) {
      this.extension_instance.disable();
      this.extension_instance = undefined;
    }
  }
}
