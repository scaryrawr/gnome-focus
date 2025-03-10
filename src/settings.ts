import Gio from 'gi://Gio';

type SettingsChangeEvents = {
  'focus-opacity': number;
  'special-opacity': number;
  'inactive-opacity': number;
  'is-background-blur': boolean;
  'is-desaturate-enabled': boolean;
  'desaturate-percentage': number;
};

type CallbackTypes<Type> = {
  [Property in keyof Type]: (args: Type[Property]) => void;
};

type ListenerMap<Type> = {
  [Property in keyof Type]: Array<(value: Type[Property]) => void>;
};

type SettingsListenerMap = ListenerMap<SettingsChangeEvents>;

export class FocusSettings {
  settings: Gio.Settings;
  connection: number | undefined;
  listeners: SettingsListenerMap = {
    'focus-opacity': [],
    'inactive-opacity': [],
    'special-opacity': [],
    'is-background-blur': [],
    'desaturate-percentage': [],
    'is-desaturate-enabled': []
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

  on<E extends keyof SettingsChangeEvents>(event: E, callback: CallbackTypes<SettingsChangeEvents>[E]): void {
    if (this.connection === undefined) {
      this.connection = this.settings.connect('changed', (_, key: keyof SettingsChangeEvents) => {
        switch (key) {
          case 'focus-opacity':
          case 'inactive-opacity':
          case 'special-opacity':
          case 'desaturate-percentage':
            this.emit(key, this.settings.get_uint(key));
            break;
          case 'is-background-blur':
          case 'is-desaturate-enabled':
            this.emit(key, this.settings.get_boolean(key));
            break;
        }
      });
    }

    this.listeners[event].push(callback);
  }

  off<E extends keyof SettingsChangeEvents>(event: E, callback: (value: SettingsChangeEvents[E]) => void): void {
    const index = this.listeners[event].indexOf(callback);
    if (index >= 0) {
      this.listeners[event].slice(index, 1);
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
    if (this.connection !== undefined) {
      this.settings.disconnect(this.connection);
      delete this.connection;
    }

    for (const key in this.listeners) {
      if (this.listeners[key as keyof SettingsChangeEvents].length > 0) {
        return;
      }
    }
  }
}

export function get_settings(settings: Gio.Settings): FocusSettings {
  return new FocusSettings(settings);
}
