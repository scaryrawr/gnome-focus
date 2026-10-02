import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { load_config } from './config.js';
import { GnomeFocusManager, is_valid_window_type } from './GnomeFocusManager.js';

import { get_settings } from './settings.js';

export default class GnomeFocus extends Extension {
  private config_cancellable: Gio.Cancellable | undefined;
  private focus_manager: GnomeFocusManager | undefined;
  private pending_window_actors: Set<Meta.WindowActor> | undefined;
  private stacked_window_cycle: Meta.WindowActor[] = [];

  private focus_changed = (): void => {
    this.focus_manager?.refresh(this.pending_window_actors);
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
    window_actor.connectObject(
      'first-frame',
      () => {
        window_actor.disconnectObject(this);
        if (this.pending_window_actors?.delete(window_actor)) {
          this.focus_manager?.refresh(this.pending_window_actors);
        }
      },
      'destroy',
      () => {
        window_actor.disconnectObject(this);
        this.pending_window_actors?.delete(window_actor);
      },
      this
    );
  };

  private is_window_under_pointer = (window_actor: Meta.WindowActor, x: number, y: number): boolean => {
    if (window_actor.is_destroyed()) {
      return false;
    }

    const window = window_actor.get_meta_window();
    if (!window || !is_valid_window_type(window) || !window.showing_on_its_workspace()) {
      return false;
    }

    const frame = window.get_frame_rect();
    return x >= frame.x && x < frame.x + frame.width && y >= frame.y && y < frame.y + frame.height;
  };

  private cycle_stacked_windows = (_actor: Clutter.Actor, event: Clutter.Event): boolean => {
    const modifiers = event.get_state();
    if (
      event.type() !== Clutter.EventType.SCROLL ||
      !(modifiers & Clutter.ModifierType.SUPER_MASK) ||
      !(modifiers & Clutter.ModifierType.CONTROL_MASK)
    ) {
      return Clutter.EVENT_PROPAGATE;
    }

    const scroll_direction = event.get_scroll_direction();
    if (scroll_direction !== Clutter.ScrollDirection.UP && scroll_direction !== Clutter.ScrollDirection.DOWN) {
      return Clutter.EVENT_PROPAGATE;
    }

    const [x, y] = event.get_coords();
    // Mutter returns actors from bottom to top; reverse them so the cycle starts with the visible front window.
    const window_actors = global
      .get_window_actors()
      .filter(window_actor => this.is_window_under_pointer(window_actor, x, y))
      .reverse();

    if (window_actors.length < 2) {
      this.stacked_window_cycle = [];
      return Clutter.EVENT_PROPAGATE;
    }

    const cycle_is_current =
      this.stacked_window_cycle.length === window_actors.length &&
      this.stacked_window_cycle.every(window_actor => window_actors.includes(window_actor));
    if (!cycle_is_current) {
      this.stacked_window_cycle = window_actors;
    }

    const focused_window = global.display.focus_window;
    const focused_index = this.stacked_window_cycle.findIndex(
      window_actor => window_actor.get_meta_window() === focused_window
    );
    const step = scroll_direction === Clutter.ScrollDirection.DOWN ? 1 : -1;
    const target_index =
      focused_index < 0
        ? step > 0
          ? 0
          : this.stacked_window_cycle.length - 1
        : (focused_index + step + this.stacked_window_cycle.length) % this.stacked_window_cycle.length;
    const target_window = this.stacked_window_cycle[target_index]?.get_meta_window();

    if (!target_window) {
      this.stacked_window_cycle = [];
      return Clutter.EVENT_PROPAGATE;
    }

    target_window.activate(event.get_time());
    return Clutter.EVENT_STOP;
  };

  async enable() {
    const cancellable = new Gio.Cancellable();
    this.config_cancellable = cancellable;

    const [special_focus, ignore_focus] = await Promise.all([
      load_config(this.metadata, 'special_focus.json', cancellable),
      load_config(this.metadata, 'ignore_focus.json', cancellable)
    ]);

    if (this.config_cancellable !== cancellable || cancellable.is_cancelled()) {
      return;
    }
    this.config_cancellable = undefined;

    const settings = get_settings(this.getSettings());
    settings.normalize_special_focus_windows();
    settings.normalize_excluded_windows();
    const pending_window_actors = new Set<Meta.WindowActor>();
    this.pending_window_actors = pending_window_actors;
    this.focus_manager = new GnomeFocusManager(settings, special_focus, ignore_focus, pending_window_actors);

    global.display.connectObject(
      'notify::focus-window',
      this.focus_changed,
      'window-created',
      this.window_created,
      this
    );
    global.stage.connectObject('captured-event', this.cycle_stacked_windows, this);

    this.focus_manager.refresh();
  }

  disable() {
    this.config_cancellable?.cancel();
    this.config_cancellable = undefined;

    global.display.disconnectObject(this);
    global.stage.disconnectObject(this);
    this.stacked_window_cycle = [];

    for (const window_actor of this.pending_window_actors ?? []) {
      window_actor.disconnectObject(this);
    }
    this.pending_window_actors?.clear();
    this.pending_window_actors = undefined;

    if (this.focus_manager) {
      this.focus_manager.disable();
      this.focus_manager = undefined;
    }
  }
}
