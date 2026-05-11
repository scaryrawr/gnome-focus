import Meta from 'gi://Meta';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { load_config } from './config.js';
import { GnomeFocusManager, is_valid_window_type } from './GnomeFocusManager.js';

import { get_settings } from './settings.js';
import { Timeouts } from './timeout.js';

let create_signal: number | undefined;

let focus_signal: number | undefined;

let extension_instance: GnomeFocusManager | undefined;

let timeout_manager: Timeouts | undefined;

function get_window_actor(window: Meta.Window) {
  const actor = window.get_compositor_private() as Meta.WindowActor | null;
  if (actor && !actor.is_destroyed()) {
    return actor;
  }

  for (const actor of global.get_window_actors()) {
    if (!actor.is_destroyed() && actor.get_meta_window() === window) {
      return actor;
    }
  }

  return undefined;
}

function focus_changed() {
  const window = global.display.focus_window;
  if (!window) {
    return;
  }

  const actor = get_window_actor(window);
  if (actor) {
    extension_instance?.set_active_window_actor(actor);
  }
}

export default class GnomeFocus extends Extension {
  enable() {
    extension_instance = new GnomeFocusManager(
      get_settings(this.getSettings()),
      load_config<string[]>(this.metadata, 'special_focus.json'),
      load_config<string[]>(this.metadata, 'ignore_focus.json')
    );

    focus_signal = global.display.connect('notify::focus-window', focus_changed);

    create_signal = global.display.connect('window-created', function (_, win: Meta.Window) {
      if (!is_valid_window_type(win)) {
        return;
      }

      timeout_manager ??= new Timeouts();

      // In Wayland, when we have a new window, we need a slight delay before
      // attempting to set the transparency.
      timeout_manager.add(() => {
        if (!win) {
          return false;
        }

        if (undefined === extension_instance) {
          return false;
        }

        // We could have something go wrong, but always want to set false,
        // otherwise we end up being called more than once
        try {
          const actor = get_window_actor(win);
          if (undefined === actor || actor.is_destroyed()) {
            return false;
          }

          if (global.display.focus_window === win) {
            extension_instance.set_active_window_actor(actor);
          } else {
            extension_instance.update_inactive_window_actor(actor);
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

      const win = actor.get_meta_window();
      if (!win) {
        continue;
      }

      if (!is_valid_window_type(win)) {
        continue;
      }

      if (global.display.focus_window === win) {
        extension_instance.set_active_window_actor(actor);
      } else {
        extension_instance.update_inactive_window_actor(actor);
      }
    }

    focus_changed();
  }

  disable() {
    if (undefined !== create_signal) {
      global.display.disconnect(create_signal);
      create_signal = undefined;
    }

    if (undefined !== focus_signal) {
      global.display.disconnect(focus_signal);
      focus_signal = undefined;
    }

    timeout_manager?.clear();
    timeout_manager = undefined;

    if (undefined !== extension_instance) {
      extension_instance.disable();
      extension_instance = undefined;
    }
  }
}
