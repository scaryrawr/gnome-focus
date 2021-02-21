const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gio = imports.gi.Gio;

import { Settings } from '@imports/Gio-2.0';

export class FocusSettings {
  settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  get focus_opacity() {
    return this.settings.get_uint('focus-opacity');
  }

  set_focus_opacity(val: number) {
    this.settings.set_uint('focus-opacity', val);
  }

  get special_focus_opacity() {
    return this.settings.get_uint('special-focus-opacity');
  }

  set_special_focus_opacity(val: number) {
    this.settings.set_uint('special-focus-opacity', val);
  }

  get inactive_opacity() {
    return this.settings.get_uint('inactive-opacity');
  }

  set_inactive_opacity(val: number) {
    this.settings.set_uint('inactive-opacity', val);
  }
}

export function get_settings() {
  const schema = Gio.SettingsSchemaSource.new_from_directory(
    Me.dir.get_child('schemas').get_path(),
    Gio.SettingsSchemaSource.get_default(),
    false
  );

  return new FocusSettings(
    new Gio.Settings({
      settings_schema: schema.lookup('org.gnome.shell.extensions.focus', true) ?? undefined,
    })
  );
}
