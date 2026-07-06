import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { load_config } from './config.js';
import { GnomeFocusManager, is_valid_window_type } from './GnomeFocusManager.js';

import { get_settings } from './settings.js';
import { signal_tracked } from './signals.js';

let refresh_timeout: number | undefined;

let extension_instance: GnomeFocusManager | undefined;
let background_settings: Gio.Settings | undefined;
let enable_generation = 0;

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
  async enable() {
    const generation = ++enable_generation;

    const special_focus = await load_config<string[]>(this.metadata, 'special_focus.json');
    const ignore_focus = await load_config<string[]>(this.metadata, 'ignore_focus.json');

    if (generation !== enable_generation) {
      return;
    }

    extension_instance = new GnomeFocusManager(
      get_settings(this.getSettings()),
      special_focus,
      ignore_focus
    );

    signal_tracked(global.display).connectObject('notify::focus-window', focus_changed, this);
    background_settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
    signal_tracked(background_settings).connectObject(
      'changed::picture-uri',
      background_changed,
      'changed::picture-uri-dark',
      background_changed,
      this
    );

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
    enable_generation++;

    signal_tracked(global.display).disconnectObject(this);
    clear_refresh_timeout();

    if (background_settings) {
      signal_tracked(background_settings).disconnectObject(this);
    }
    background_settings = undefined;

    if (undefined !== extension_instance) {
      extension_instance.disable();
      extension_instance = undefined;
    }
  }
}
