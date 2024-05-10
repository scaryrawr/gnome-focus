import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { get_settings } from './settings.js';

export default class GnomeFocusPreferences extends ExtensionPreferences {
  init() {}

  getPreferencesWidget() {
    const settings = get_settings(this.getSettings());

    const widget = new Gtk.Grid({
      columnSpacing: 12,
      rowSpacing: 12,
      visible: true
    });

    const title = new Gtk.Label({
      label: '<b>' + this.metadata.name + ' Extension Preferences</b>',
      halign: Gtk.Align.START,
      useMarkup: true,
      visible: true
    });

    widget.attach(title, 0, 0, 1, 1);

    const create_scale = (label: string, get_current_value: () => number, set_value: (value: number) => void) => {
      const item_label = new Gtk.Label({
        label,
        halign: Gtk.Align.START,
        visible: true
      });

      const item_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 50, 100, 5);
      item_scale.set_visible(true);
      item_scale.set_value(get_current_value());
      item_scale.connect('change-value', () => {
        const value = item_scale.get_value();
        if (value <= 100 && value >= 50) {
          set_value(value);
          Gio.Settings.sync();
        }
      });

      return [item_label, item_scale];
    };

    const [focus_opacity_label, focus_opacity_scale] = create_scale(
      'Focus Opacity',
      () => settings.focus_opacity,
      value => settings.set_focus_opacity(value)
    );
    widget.attach(focus_opacity_label, 0, 1, 1, 1);
    widget.attach(focus_opacity_scale, 0, 2, 2, 1);

    const [inactive_opacity_label, inactive_opacity_scale] = create_scale(
      'Inactive Opacity',
      () => settings.inactive_opacity,
      value => settings.set_inactive_opacity(value)
    );
    widget.attach(inactive_opacity_label, 0, 3, 1, 1);
    widget.attach(inactive_opacity_scale, 0, 4, 2, 1);

    const [special_focus_opacity_label, special_focus_opacity_scale] = create_scale(
      'Special Focus Opacity',
      () => settings.special_focus_opacity,
      value => settings.set_special_focus_opacity(value)
    );
    widget.attach(special_focus_opacity_label, 0, 5, 1, 1);
    widget.attach(special_focus_opacity_scale, 0, 6, 2, 1);

    const blur_label = new Gtk.Label({
      label: 'Blur Background [Experimental]',
      halign: Gtk.Align.START,
      visible: true
    });

    const blur_toggle = new Gtk.Switch({
      visible: true,
      active: settings.is_background_blur
    });

    blur_toggle.connect('notify::active', () => {
      settings.set_is_background_blur(blur_toggle.get_active());
      Gio.Settings.sync();
    });

    widget.attach(blur_label, 0, 7, 1, 1);

    widget.attach(blur_toggle, 1, 7, 1, 1);

    const blur_sigma_label = new Gtk.Label({
      label: 'Blur Sigma',
      halign: Gtk.Align.START,
      visible: true
    });

    const blur_sigma_entry = new Gtk.Entry({
      inputPurpose: Gtk.InputPurpose.NUMBER,
      visible: true
    });

    blur_sigma_entry.set_text(settings.blur_sigma.toString());
    blur_sigma_entry.connect('changed', function () {
      if (!blur_sigma_entry.text) {
        return;
      }

      const value = parseInt(blur_sigma_entry.text);
      if (!isNaN(value) && value >= 0) {
        settings.set_blur_sigma(value);
        Gio.Settings.sync();
      }
    });

    widget.attach(blur_sigma_label, 0, 8, 1, 1);
    widget.attach(blur_sigma_entry, 1, 8, 1, 1);

    return widget;
  }
}
