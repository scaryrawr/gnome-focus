import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { FocusSettings, get_settings, normalize_excluded_window_criterion } from './settings.js';

type PercentageRowOptions = {
  title: string;
  subtitle: string;
  value: number;
  step: number;
  set_value: (value: number) => void;
};

/** Creates an integer percentage row aligned with the schema's 0..100 range. */
function create_percentage_row({ title, subtitle, value, step, set_value }: PercentageRowOptions): Adw.SpinRow {
  const row = Adw.SpinRow.new_with_range(0, 100, step);
  row.set_title(title);
  row.set_subtitle(subtitle);
  row.set_value(value);
  row.connect('notify::value', () => {
    const rounded_value = Math.round(row.get_value());
    if (rounded_value !== row.get_value()) {
      row.set_value(rounded_value);
      return;
    }
    set_value(rounded_value);
  });
  return row;
}

/** Adds the appearance controls to the preferences window. */
function add_appearance_page(window: Adw.PreferencesWindow, settings: FocusSettings): void {
  const page = new Adw.PreferencesPage({
    title: 'Appearance',
    icon_name: 'applications-graphics-symbolic'
  });
  const opacity_group = new Adw.PreferencesGroup({
    title: 'Opacity',
    description: 'Set window opacity as a percentage.'
  });

  opacity_group.add(
    create_percentage_row({
      title: 'Focused windows',
      subtitle: 'Opacity for the active window',
      value: settings.focus_opacity,
      step: 5,
      set_value: value => settings.set_focus_opacity(value)
    })
  );
  opacity_group.add(
    create_percentage_row({
      title: 'Inactive windows',
      subtitle: 'Opacity for windows that do not have focus',
      value: settings.inactive_opacity,
      step: 5,
      set_value: value => settings.set_inactive_opacity(value)
    })
  );
  opacity_group.add(
    create_percentage_row({
      title: 'Special focus windows',
      subtitle: 'Focused opacity for matches from special_focus.json',
      value: settings.special_focus_opacity,
      step: 5,
      set_value: value => settings.set_special_focus_opacity(value)
    })
  );

  const effects_group = new Adw.PreferencesGroup({
    title: 'Inactive Window Effects'
  });
  const blur_row = new Adw.SwitchRow({
    title: 'Blur',
    subtitle: 'Blur inactive windows',
    active: settings.is_background_blur
  });
  blur_row.connect('notify::active', () => {
    settings.set_is_background_blur(blur_row.get_active());
  });
  effects_group.add(blur_row);

  const desaturate_row = new Adw.SwitchRow({
    title: 'Desaturate',
    subtitle: 'Remove color from inactive windows',
    active: settings.is_desaturate_enabled
  });
  desaturate_row.connect('notify::active', () => {
    settings.set_is_desaturate_enabled(desaturate_row.get_active());
  });
  effects_group.add(desaturate_row);
  effects_group.add(
    create_percentage_row({
      title: 'Desaturation',
      subtitle: 'Amount of color removed from inactive windows',
      value: settings.desaturate_percentage,
      step: 10,
      set_value: value => settings.set_desaturate_percentage(value)
    })
  );

  page.add(opacity_group);
  page.add(effects_group);
  window.add(page);
}

/** Adds one removable exact-match criterion row. */
function add_exclusion_row(
  group: Adw.PreferencesGroup,
  settings: FocusSettings,
  criterion: string,
  on_removed: () => void
): void {
  const row = new Adw.ActionRow({
    title: criterion,
    subtitle: 'Matches WM_CLASS, WM_CLASS instance, or window title',
    subtitle_selectable: true,
    use_markup: false
  });
  const remove_button = new Gtk.Button({
    icon_name: 'edit-delete-symbolic',
    tooltip_text: `Remove ${criterion}`,
    valign: Gtk.Align.CENTER
  });
  remove_button.add_css_class('flat');
  remove_button.connect('clicked', () => {
    settings.set_excluded_windows(settings.excluded_windows.filter(value => value !== criterion));
    group.remove(row);
    on_removed();
  });
  row.add_suffix(remove_button);
  row.set_activatable_widget(remove_button);
  group.add(row);
}

/** Adds the editor for GSettings-backed exclusion criteria. */
function add_exclusions_page(window: Adw.PreferencesWindow, settings: FocusSettings): void {
  const page = new Adw.PreferencesPage({
    title: 'Excluded Windows',
    icon_name: 'action-unavailable-symbolic'
  });
  const group = new Adw.PreferencesGroup({
    title: 'Exact Matches',
    description:
      'Excluded windows keep their normal appearance. Matching is exact and case-sensitive against WM_CLASS, its instance, or the full window title.'
  });
  const entry_row = new Adw.EntryRow({
    title: 'Add WM_CLASS, instance, or title'
  });
  const add_button = new Gtk.Button({
    icon_name: 'list-add-symbolic',
    tooltip_text: 'Add criterion',
    valign: Gtk.Align.CENTER
  });
  add_button.add_css_class('flat');
  entry_row.add_suffix(add_button);
  group.add(entry_row);

  const update_add_button = (): void => {
    const criterion = normalize_excluded_window_criterion(entry_row.get_text());
    const is_duplicate = criterion ? settings.excluded_windows.includes(criterion) : false;
    add_button.set_sensitive(!!criterion && !is_duplicate);
    add_button.set_tooltip_text(is_duplicate ? 'Criterion already exists' : 'Add criterion');
  };
  const add_criterion = (): void => {
    const criterion = normalize_excluded_window_criterion(entry_row.get_text());
    if (!criterion || settings.excluded_windows.includes(criterion)) {
      return;
    }

    settings.set_excluded_windows([...settings.excluded_windows, criterion]);
    add_exclusion_row(group, settings, criterion, update_add_button);
    entry_row.set_text('');
  };

  entry_row.connect('changed', update_add_button);
  entry_row.connect('entry-activated', add_criterion);
  add_button.connect('clicked', add_criterion);
  update_add_button();

  for (const criterion of settings.normalize_excluded_windows()) {
    add_exclusion_row(group, settings, criterion, update_add_button);
  }

  page.add(group);
  window.add(page);
}

export default class GnomeFocusPreferences extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    const settings = get_settings(this.getSettings());
    window.set_search_enabled(true);
    add_appearance_page(window, settings);
    add_exclusions_page(window, settings);
  }
}
