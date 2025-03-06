import Gtk from 'gi://Gtk';

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

    const create_spin_button = ({
      label,
      get_current_value,
      set_value,
      min,
      max,
      step
    }: {
      label: string;
      get_current_value: () => number;
      set_value: (value: number) => void;
      min: number;
      max: number;
      step: number;
    }) => {
      const item_label = new Gtk.Label({
        label: `${label}: [${Math.floor(get_current_value())}]`,
        halign: Gtk.Align.START,
        visible: true
      });

      const spin_button = Gtk.SpinButton.new_with_range(min, max, step);
      spin_button.set_visible(true);
      spin_button.set_value(get_current_value());

      spin_button.connect('value-changed', (emitter: Gtk.SpinButton) => {
        const value = emitter.get_value();
        item_label.set_label(`${label}: [${Math.floor(value)}]`);
        set_value(value);
      });

      return [item_label, spin_button];
    };

    const [focus_opacity_label, focus_opacity_scale] = create_spin_button({
      label: 'Focus Opacity',
      get_current_value: () => settings.focus_opacity,
      set_value: value => {
        settings.set_focus_opacity(value);
      },
      min: 50,
      max: 100,
      step: 5
    });

    widget.attach(focus_opacity_label, 0, 1, 1, 1);
    widget.attach(focus_opacity_scale, 0, 2, 2, 1);

    const [inactive_opacity_label, inactive_opacity_scale] = create_spin_button({
      label: 'Inactive Opacity',
      get_current_value: () => settings.inactive_opacity,
      set_value: value => {
        settings.set_inactive_opacity(value);
      },
      min: 50,
      max: 100,
      step: 5
    });

    widget.attach(inactive_opacity_label, 0, 3, 1, 1);
    widget.attach(inactive_opacity_scale, 0, 4, 2, 1);

    const [special_focus_opacity_label, special_focus_opacity_scale] = create_spin_button({
      label: 'Special Focus Opacity',
      get_current_value: () => settings.special_focus_opacity,
      set_value: value => {
        settings.set_special_focus_opacity(value);
      },
      min: 50,
      max: 100,
      step: 5
    });

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
    });

    widget.attach(blur_label, 0, 7, 1, 1);

    widget.attach(blur_toggle, 1, 7, 1, 1);

    const desaturate_label = new Gtk.Label({
      label: 'Desaturate Inactive Windows',
      halign: Gtk.Align.START,
      visible: true
    });

    const desaturate_toggle = new Gtk.Switch({
      visible: true,
      active: settings.is_desaturate_enabled
    });

    desaturate_toggle.connect('notify::active', () => {
      settings.set_is_desaturate_enabled(desaturate_toggle.get_active());
    });

    widget.attach(desaturate_label, 0, 8, 1, 1);
    widget.attach(desaturate_toggle, 1, 8, 1, 1);

    const [desaturate_percentage_label, desaturate_percentage_scale] = create_spin_button({
      label: 'Desaturate Percentage',
      get_current_value: () => settings.desaturate_percentage,
      set_value: value => {
        settings.set_desaturate_percentage(value);
      },
      min: 0,
      max: 100,
      step: 10
    });

    widget.attach(desaturate_percentage_label, 0, 9, 1, 1);
    widget.attach(desaturate_percentage_scale, 0, 10, 2, 1);

    return widget;
  }
}
