import Gio from 'gi://Gio';

type SettingsChangeEvents = {
  'focus-opacity': number;
  'special-opacity': number;
  'inactive-opacity': number;
  'is-background-blur': boolean;
  'is-desaturate-enabled': boolean;
  'desaturate-percentage': number;
  'special-focus-windows': string[];
  'excluded-windows': string[];
};

type CallbackTypes<Type> = {
  [Property in keyof Type]: (args: Type[Property]) => void;
};

type ListenerMap<Type> = {
  [Property in keyof Type]: Array<(value: Type[Property]) => void>;
};

type SettingsListenerMap = ListenerMap<SettingsChangeEvents>;

/** Returns one trimmed, non-empty exact-match window criterion. */
export function normalize_window_criterion(criterion: string): string | undefined {
  const normalized = criterion.trim();
  return normalized.length > 0 ? normalized : undefined;
}

/** Canonicalizes exact-match window criteria while preserving their original order. */
export function normalize_window_criteria(criteria: readonly string[]): string[] {
  const normalized_criteria: string[] = [];
  const seen_criteria = new Set<string>();

  for (const criterion of criteria) {
    const normalized = normalize_window_criterion(criterion);
    if (normalized && !seen_criteria.has(normalized)) {
      seen_criteria.add(normalized);
      normalized_criteria.push(normalized);
    }
  }

  return normalized_criteria;
}

export class FocusSettings {
  settings: Gio.Settings;
  private signal_id: number | undefined;
  listeners: SettingsListenerMap = {
    'focus-opacity': [],
    'inactive-opacity': [],
    'special-opacity': [],
    'is-background-blur': [],
    'desaturate-percentage': [],
    'is-desaturate-enabled': [],
    'special-focus-windows': [],
    'excluded-windows': []
  };

  constructor(settings: Gio.Settings) {
    this.settings = settings;
  }

  get focus_opacity(): number {
    return this.settings.get_uint('focus-opacity');
  }

  set_focus_opacity(val: number): void {
    this.settings.set_uint('focus-opacity', val);
  }

  get special_focus_opacity(): number {
    return this.settings.get_uint('special-focus-opacity');
  }

  set_special_focus_opacity(val: number): void {
    this.settings.set_uint('special-focus-opacity', val);
  }

  get inactive_opacity(): number {
    return this.settings.get_uint('inactive-opacity');
  }

  set_inactive_opacity(val: number): void {
    this.settings.set_uint('inactive-opacity', val);
  }

  get is_background_blur(): boolean {
    return this.settings.get_boolean('is-background-blur');
  }

  set_is_background_blur(val: boolean): void {
    this.settings.set_boolean('is-background-blur', val);
  }

  get desaturate_percentage(): number {
    return this.settings.get_uint('desaturate-percentage');
  }

  set_desaturate_percentage(val: number): void {
    this.settings.set_uint('desaturate-percentage', val);
  }

  get is_desaturate_enabled(): boolean {
    return this.settings.get_boolean('is-desaturate-enabled');
  }

  set_is_desaturate_enabled(val: boolean): void {
    this.settings.set_boolean('is-desaturate-enabled', val);
  }

  get special_focus_windows(): string[] {
    return normalize_window_criteria(this.settings.get_strv('special-focus-windows'));
  }

  set_special_focus_windows(criteria: readonly string[]): void {
    this.settings.set_strv('special-focus-windows', normalize_window_criteria(criteria));
  }

  get excluded_windows(): string[] {
    return normalize_window_criteria(this.settings.get_strv('excluded-windows'));
  }

  set_excluded_windows(criteria: readonly string[]): void {
    this.settings.set_strv('excluded-windows', normalize_window_criteria(criteria));
  }

  /** Rewrites manually edited special-focus settings into the preferences format. */
  normalize_special_focus_windows(): string[] {
    return this.normalize_window_list('special-focus-windows');
  }

  /** Rewrites manually edited exclusion settings into the preferences format. */
  normalize_excluded_windows(): string[] {
    return this.normalize_window_list('excluded-windows');
  }

  private normalize_window_list(key: 'special-focus-windows' | 'excluded-windows'): string[] {
    const stored_criteria = this.settings.get_strv(key);
    const normalized_criteria = normalize_window_criteria(stored_criteria);
    if (
      stored_criteria.length !== normalized_criteria.length ||
      stored_criteria.some((criterion, index) => criterion !== normalized_criteria[index])
    ) {
      this.settings.set_strv(key, normalized_criteria);
    }

    return normalized_criteria;
  }

  on<E extends keyof SettingsChangeEvents>(event: E, callback: CallbackTypes<SettingsChangeEvents>[E]): void {
    if (this.signal_id === undefined) {
      this.signal_id = this.settings.connect('changed', (_settings: Gio.Settings, key: string) => {
        switch (key) {
          case 'focus-opacity':
          case 'inactive-opacity':
          case 'desaturate-percentage':
            this.emit(key, this.settings.get_uint(key));
            break;
          case 'special-focus-opacity':
            this.emit('special-opacity', this.settings.get_uint('special-focus-opacity'));
            break;
          case 'is-background-blur':
          case 'is-desaturate-enabled':
            this.emit(key, this.settings.get_boolean(key));
            break;
          case 'special-focus-windows':
            this.emit(key, this.special_focus_windows);
            break;
          case 'excluded-windows':
            this.emit(key, this.excluded_windows);
            break;
        }
      });
    }

    this.listeners[event].push(callback);
  }

  off<E extends keyof SettingsChangeEvents>(event: E, callback: (value: SettingsChangeEvents[E]) => void): void {
    const index = this.listeners[event].indexOf(callback);
    if (index >= 0) {
      this.listeners[event].splice(index, 1);
    }

    for (const key in this.listeners) {
      if (this.listeners[key as keyof SettingsChangeEvents].length > 0) {
        return;
      }
    }

    this.clear();
  }

  emit<E extends keyof SettingsChangeEvents>(event: E, value: SettingsChangeEvents[E]): void {
    for (const listener of this.listeners[event]) {
      listener(value);
    }
  }

  clear(): void {
    if (this.signal_id !== undefined) {
      this.settings.disconnect(this.signal_id);
      this.signal_id = undefined;
    }

    for (const key in this.listeners) {
      this.listeners[key as keyof SettingsChangeEvents].length = 0;
    }
  }
}

export function get_settings(settings: Gio.Settings): FocusSettings {
  return new FocusSettings(settings);
}
