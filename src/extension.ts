const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const GLib = imports.gi.GLib;

import { Window } from '@imports/Meta-8';
import { load_config } from './config';
import { GnomeFocusManager, is_valid_window_type } from './GnomeFocusManager';

import { get_settings } from './settings';

type ExtendedWindow = Window & {
  _focus_extension_signal?: number;
};

let create_signal: number | undefined;

let extension_instance: GnomeFocusManager | undefined;

function get_window_actor(window: Window) {
  for (const actor of global.get_window_actors()) {
    if (!actor.is_destroyed() && actor.get_meta_window() === window) {
      return actor;
    }
  }

  return undefined;
}

function focus_changed(window: Window) {
  const actor = get_window_actor(window);
  if (actor) {
    extension_instance?.set_active_window_actor(actor);
  }
}

function enable() {
  log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

  extension_instance = new GnomeFocusManager(
    get_settings(),
    load_config<string[]>('special_focus.json'),
    load_config<string[]>('ignore_focus.json')
  );

  create_signal = global.display.connect('window-created', function (_, win: ExtendedWindow) {
    if (!is_valid_window_type(win)) {
      return;
    }

    win._focus_extension_signal = win.connect('focus', focus_changed);

    // In Wayland, when we have a new window, we need ot have a slight delay before
    // attempting to set the transparency.
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 350, function () {
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

        if (win.has_focus()) {
          extension_instance.set_active_window_actor(actor);
        } else {
          extension_instance.update_inactive_window_actor(actor);
        }
      } catch (err) {
        log(`Error on new window: ${err}`);
      }

      return false;
    });
  });

  for (const actor of global.get_window_actors()) {
    if (actor.is_destroyed()) {
      continue;
    }

    const win = actor.get_meta_window() as ExtendedWindow;
    if (!is_valid_window_type(win)) {
      continue;
    }

    if (undefined === win._focus_extension_signal) {
      win._focus_extension_signal = win.connect('focus', focus_changed);
    }

    if (win.has_focus()) {
      extension_instance.set_active_window_actor(actor);
    } else {
      extension_instance.update_inactive_window_actor(actor);
    }
  }
}

function disable() {
  log(`disabling ${Me.metadata.name} version ${Me.metadata.version}`);

  if (undefined !== create_signal) {
    global.display.disconnect(create_signal);
    create_signal = undefined;
  }

  for (const actor of global.get_window_actors()) {
    if (actor.is_destroyed()) {
      continue;
    }

    const win = actor.get_meta_window() as ExtendedWindow;
    if (win._focus_extension_signal) {
      win.disconnect(win._focus_extension_signal);
      delete win._focus_extension_signal;
    }
  }

  if (undefined !== extension_instance) {
    extension_instance.disable();
    extension_instance = undefined;
  }
}

export default function () {
  return {
    enable,
    disable,
  };
}
