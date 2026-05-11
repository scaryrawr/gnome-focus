import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { load_config } from './config.js';
import { GnomeFocusManager, is_valid_window_type } from './GnomeFocusManager.js';

import { get_settings } from './settings.js';

let focus_signal: number | undefined;
let background_signal: number | undefined;
let background_dark_signal: number | undefined;
let refresh_timeout: number | undefined;

let extension_instance: GnomeFocusManager | undefined;
let background_settings: Gio.Settings | undefined;

function clear_refresh_timeout() {
  if (refresh_timeout === undefined) {
    return;
  }

  GLib.source_remove(refresh_timeout);
  refresh_timeout = undefined;
}

function schedule_refresh(delay: number) {
  clear_refresh_timeout();

  refresh_timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
    refresh_timeout = undefined;
    extension_instance?.refresh();
    return GLib.SOURCE_REMOVE;
  });
}

function background_changed() {
  extension_instance?.suspend_effects();
  schedule_refresh(600);
}

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
    background_settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
    background_signal = background_settings.connect('changed::picture-uri', background_changed);
    background_dark_signal = background_settings.connect('changed::picture-uri-dark', background_changed);

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

    clear_refresh_timeout();

    if (background_settings && background_signal !== undefined) {
      background_settings.disconnect(background_signal);
      background_signal = undefined;
    }

    if (background_settings && background_dark_signal !== undefined) {
      background_settings.disconnect(background_dark_signal);
      background_dark_signal = undefined;
    }

    background_settings = undefined;

    if (undefined !== extension_instance) {
      extension_instance.disable();
      extension_instance = undefined;
    }
  }
}
