import type Meta from 'gi://Meta';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { load_config } from './config.js';
import { GnomeFocusManager, is_valid_window_type } from './GnomeFocusManager.js';

import { get_settings } from './settings.js';
import { Timeouts } from './timeout.js';

type ExtendedWindow = Meta.Window & {
  _focus_extension_signal?: number;
};

function get_window_actor(window: Meta.Window) {
  return global.get_window_actors().find(actor => !actor.is_destroyed() && actor.get_meta_window() === window);
}

export default class GnomeFocus extends Extension {
  create_signal: number | undefined;
  extension_instance: GnomeFocusManager | undefined;
  timeout_manager: Timeouts | undefined;

  focus_changed = (window: Meta.Window) => {
    const actor = get_window_actor(window);
    if (actor) {
      this.extension_instance?.set_active_window_actor(actor);
    }
  };

  enable() {
    this.extension_instance = new GnomeFocusManager(
      get_settings(this.getSettings()),
      load_config<string[]>(this.metadata, 'special_focus.json'),
      load_config<string[]>(this.metadata, 'ignore_focus.json')
    );

    this.create_signal = global.display.connect('window-created', (_, win: ExtendedWindow) => {
      if (!is_valid_window_type(win)) {
        return;
      }

      win._focus_extension_signal = win.connect('focus', this.focus_changed);

      this.timeout_manager ??= new Timeouts();

      // In Wayland, when we have a new window, we need ot have a slight delay before
      // attempting to set the transparency.
      this.timeout_manager.add(() => {
        if (!win || !this.extension_instance) {
          return false;
        }

        // We could have something go wrong, but always want to set false,
        // otherwise we end up being called more than once
        try {
          const actor = get_window_actor(win);
          if (undefined === actor || actor.is_destroyed()) {
            return false;
          }

          if (!actor.is_realized()) {
            return true;
          }

          if (win.has_focus()) {
            this.extension_instance.set_active_window_actor(actor);
          } else {
            this.extension_instance.update_inactive_window_actor(actor);
          }
        } catch (err) {
          console.error(`Error on new window: ${err}`);
        }

        return false;
      }, 350);
    });

    for (const actor of global.get_window_actors()) {
      if (actor.is_destroyed()) {
        continue;
      }

      const win = actor.get_meta_window() as ExtendedWindow;
      if (!is_valid_window_type(win)) {
        continue;
      }

      win._focus_extension_signal ??= win.connect('focus', this.focus_changed);

      if (win.has_focus()) {
        this.extension_instance.set_active_window_actor(actor);
      } else {
        this.extension_instance.update_inactive_window_actor(actor);
      }
    }
  }

  disable() {
    if (undefined !== this.create_signal) {
      global.display.disconnect(this.create_signal);
      delete this.create_signal;
    }

    this.timeout_manager?.clear();
    delete this.timeout_manager;

    for (const actor of global.get_window_actors()) {
      if (actor.is_destroyed()) {
        continue;
      }

      const win: ExtendedWindow | null = actor.get_meta_window();
      if (win?._focus_extension_signal) {
        win.disconnect(win._focus_extension_signal);
        delete win._focus_extension_signal;
      }
    }

    if (undefined !== this.extension_instance) {
      this.extension_instance.disable();
      delete this.extension_instance;
    }
  }
}
