import type Gio from 'gi://Gio';
import { EventEmitter } from './utilities/EventEmitter.js';
import type { SafeEmitter } from './utilities/SafeEmitter.js';

type SettingsChangeEvents = {
  'focus-opacity': [number];
  'special-opacity': [number];
  'inactive-opacity': [number];
  'blur-sigma': [number];
  'is-background-blur': [boolean];
};

export class FocusSettings extends EventEmitter implements SafeEmitter<SettingsChangeEvents> {
  settings: Gio.Settings;
  connection: number | undefined;

  constructor(settings: Gio.Settings) {
    super();
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

  get blur_sigma(): number {
    return this.settings.get_uint('blur-sigma');
  }

  set_blur_sigma(val: number): void {
    this.settings.set_uint('blur-sigma', val);
  }

  get is_background_blur(): boolean {
    return this.settings.get_boolean('is-background-blur');
  }

  set_is_background_blur(val: boolean): void {
    this.settings.set_boolean('is-background-blur', val);
  }

  clear(): void {
    if (this.connection !== undefined) {
      this.settings.disconnect(this.connection);
      delete this.connection;
    }

    this.removeAllListeners();
  }
}

export function get_settings(settings: Gio.Settings): FocusSettings {
  return new FocusSettings(settings);
}
