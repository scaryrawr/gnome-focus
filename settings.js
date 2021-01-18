'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Gio = imports.gi.Gio;

class FocusSettings {
  constructor(settings) {
    this.settings = settings;
  }

  get focus_opacity() {
    return this.settings.get_uint('focus-opacity');
  }

  set_focus_opacity(val) {
    this.settings.set_uint('focus-opacity', val);
  }

  get special_focus_opacity() {
    return this.settings.get_uint('special-focus-opacity');
  }

  set_special_focus_opacity(val) {
    this.settings.set_uint('special-focus-opacity', val);
  }

  get inactive_opacity() {
    return this.settings.get_uint('inactive-opacity');
  }

  set_inactive_opacity(val) {
    this.settings.set_uint('inactive-opacity', val);
  }
}

function get_settings() {
  const schema = Gio.SettingsSchemaSource.new_from_directory(
    Me.dir.get_child('schemas').get_path(),
    Gio.SettingsSchemaSource.get_default(),
    false
  );

  return new FocusSettings(
    new Gio.Settings({
      settings_schema: schema.lookup('org.gnome.shell.extensions.focus', true),
    })
  );
}
