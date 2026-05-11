import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { load_config } from './config.js';
import { GnomeFocusManager, is_valid_window_type } from './GnomeFocusManager.js';

import { get_settings } from './settings.js';

let focus_signal: number | undefined;
let overview_shown_signal: number | undefined;
let overview_hidden_signal: number | undefined;
let refresh_timeout: number | undefined;

let extension_instance: GnomeFocusManager | undefined;

function clear_refresh_timeout() {
  if (refresh_timeout === undefined) {
    return;
  }

  GLib.source_remove(refresh_timeout);
  refresh_timeout = undefined;
}

function schedule_refresh(delay = 0) {
  clear_refresh_timeout();

  refresh_timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
    refresh_timeout = undefined;

    if (!Main.overview.visible) {
      extension_instance?.refresh();
    }

    return GLib.SOURCE_REMOVE;
  });
}

function focus_changed() {
  if (Main.overview.visible) {
    return;
  }

  clear_refresh_timeout();
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
    overview_shown_signal = Main.overview.connect('shown', () => {
      clear_refresh_timeout();
      extension_instance?.suspend_effects();
    });
    overview_hidden_signal = Main.overview.connect('hidden', () => {
      schedule_refresh(150);
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

      extension_instance.update_inactive_window_actor(actor);
    }

    extension_instance.refresh();
  }

  disable() {
    if (undefined !== focus_signal) {
      global.display.disconnect(focus_signal);
      focus_signal = undefined;
    }

    if (undefined !== overview_shown_signal) {
      Main.overview.disconnect(overview_shown_signal);
      overview_shown_signal = undefined;
    }

    if (undefined !== overview_hidden_signal) {
      Main.overview.disconnect(overview_hidden_signal);
      overview_hidden_signal = undefined;
    }

    clear_refresh_timeout();

    if (undefined !== extension_instance) {
      extension_instance.disable();
      extension_instance = undefined;
    }
  }
}
