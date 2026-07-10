import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { FocusSettings, get_settings, normalize_window_criterion } from './settings.js';

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
      subtitle: 'Focused opacity for windows listed under Special Focus Windows',
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

type WindowListPageOptions = {
  title: string;
  icon_name: string;
  description: string;
  entry_title: string;
  row_subtitle: string;
  get_criteria: () => string[];
  set_criteria: (criteria: readonly string[]) => void;
  normalize_criteria: () => string[];
};

/** Adds one removable exact-match window criterion row. */
function add_window_criterion_row(
  group: Adw.PreferencesGroup,
  criterion: string,
  options: WindowListPageOptions,
  on_removed: () => void
): void {
  const row = new Adw.ActionRow({
    title: criterion,
    subtitle: options.row_subtitle,
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
    options.set_criteria(options.get_criteria().filter(value => value !== criterion));
    group.remove(row);
    on_removed();
  });
  row.add_suffix(remove_button);
  row.set_activatable_widget(remove_button);
  group.add(row);
}

/** Adds a preferences page for one GSettings-backed exact-match window list. */
function add_window_list_page(window: Adw.PreferencesWindow, options: WindowListPageOptions): void {
  const page = new Adw.PreferencesPage({
    title: options.title,
    icon_name: options.icon_name
  });
  const group = new Adw.PreferencesGroup({
    title: 'Exact Matches',
    description: options.description
  });
  const entry_row = new Adw.EntryRow({
    title: options.entry_title
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
    const criterion = normalize_window_criterion(entry_row.get_text());
    const is_duplicate = criterion ? options.get_criteria().includes(criterion) : false;
    add_button.set_sensitive(!!criterion && !is_duplicate);
    add_button.set_tooltip_text(is_duplicate ? 'Criterion already exists' : 'Add criterion');
  };
  const add_criterion = (): void => {
    const criterion = normalize_window_criterion(entry_row.get_text());
    if (!criterion || options.get_criteria().includes(criterion)) {
      return;
    }

    options.set_criteria([...options.get_criteria(), criterion]);
    add_window_criterion_row(group, criterion, options, update_add_button);
    entry_row.set_text('');
  };

  entry_row.connect('changed', update_add_button);
  entry_row.connect('entry-activated', add_criterion);
  add_button.connect('clicked', add_criterion);
  update_add_button();

  for (const criterion of options.normalize_criteria()) {
    add_window_criterion_row(group, criterion, options, update_add_button);
  }

  page.add(group);
  window.add(page);
}

/** Adds the editor for windows that remain transparent while focused. */
function add_special_focus_page(window: Adw.PreferencesWindow, settings: FocusSettings): void {
  add_window_list_page(window, {
    title: 'Special Focus Windows',
    icon_name: 'starred-symbolic',
    description:
      'Special focus windows use the special focused opacity while active. Matching is exact and case-sensitive against WM_CLASS, its instance, or the full window title.',
    entry_title: 'Add WM_CLASS, instance, or title',
    row_subtitle: 'Uses special focused opacity when active',
    get_criteria: () => settings.special_focus_windows,
    set_criteria: criteria => settings.set_special_focus_windows(criteria),
    normalize_criteria: () => settings.normalize_special_focus_windows()
  });
}

/** Adds the editor for windows excluded from all focus effects. */
function add_exclusions_page(window: Adw.PreferencesWindow, settings: FocusSettings): void {
  add_window_list_page(window, {
    title: 'Excluded Windows',
    icon_name: 'action-unavailable-symbolic',
    description:
      'Excluded windows keep their normal appearance. Matching is exact and case-sensitive against WM_CLASS, its instance, or the full window title.',
    entry_title: 'Add WM_CLASS, instance, or title',
    row_subtitle: 'Matches WM_CLASS, WM_CLASS instance, or window title',
    get_criteria: () => settings.excluded_windows,
    set_criteria: criteria => settings.set_excluded_windows(criteria),
    normalize_criteria: () => settings.normalize_excluded_windows()
  });
}

export default class GnomeFocusPreferences extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    const settings = get_settings(this.getSettings());
    window.set_search_enabled(true);
    add_appearance_page(window, settings);
    add_special_focus_page(window, settings);
    add_exclusions_page(window, settings);
  }
}
