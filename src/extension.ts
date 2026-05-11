import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { load_config } from './config.js';
import { GnomeFocusManager, is_valid_window_type } from './GnomeFocusManager.js';

import { get_settings } from './settings.js';

let focus_signal: number | undefined;

let extension_instance: GnomeFocusManager | undefined;

function focus_changed() {
  const window = global.display.focus_window;
  if (!window || !is_valid_window_type(window)) {
    return;
  }

  extension_instance?.refresh();
}

export default class GnomeFocus extends Extension {
  enable() {
    extension_instance = new GnomeFocusManager(
      get_settings(this.getSettings()),
      load_config<string[]>(this.metadata, 'special_focus.json'),
      load_config<string[]>(this.metadata, 'ignore_focus.json')
    );

    focus_signal = global.display.connect('notify::focus-window', focus_changed);

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

      extension_instance.update_inactive_window_actor(actor);
    }

    extension_instance.refresh();
  }

  disable() {
    if (undefined !== focus_signal) {
      global.display.disconnect(focus_signal);
      focus_signal = undefined;
    }

    if (undefined !== extension_instance) {
      extension_instance.disable();
      extension_instance = undefined;
    }
  }
}
