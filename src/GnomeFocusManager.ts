import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';

import { FocusSettings } from './settings.js';
import { signal_tracked } from './signals.js';

/** 100% opacity value */
const DEFAULT_OPACITY = 255;

/** Effect that has background blur */
const BLUR_EFFECT_NAME = 'gnome-focus-blur';

/** Effect that has desaturation */
const DESATURATE_EFFECT_NAME = 'gnome-focus-desaturate';

/** GTK application ID used by Desktop Icons NG (DING) */
const DING_APPLICATION_ID = 'com.rastersoft.ding';

/** DING's monitor geometry title, used only when no GTK application ID is available */
const DING_WINDOW_TITLE = /^@!-?\d+,-?\d+;BDHF;?$/;

/** Window Types that should be considered for focus changes */
const WINDOW_TYPES = [Meta.WindowType.NORMAL];

type OwnedOpacity = {
  original: number;
  applied: number;
};

type OwnedWindowState = {
  opacities: Map<Clutter.Actor, OwnedOpacity>;
  blur_effect?: Clutter.BlurEffect;
  desaturate_effect?: Clutter.DesaturateEffect;
};

function is_desktop_icons_window(window: Meta.Window): boolean {
  const application_id = window.get_gtk_application_id();
  if (application_id) {
    return application_id === DING_APPLICATION_ID;
  }

  const title = window.get_title();
  return title?.startsWith('Desktop Icons ') || DING_WINDOW_TITLE.test(title ?? '');
}

export function is_valid_window_type(window: Meta.Window): boolean {
  return WINDOW_TYPES.includes(window.get_window_type());
}

export class GnomeFocusManager {
  active_window_actor: Meta.WindowActor | undefined;
  private readonly owned_window_states = new Map<Meta.WindowActor, OwnedWindowState>();

  constructor(
    readonly settings: FocusSettings,
    readonly special_focus: string[] | undefined,
    readonly ignore_inactive: string[] | undefined
  ) {
    settings.on('focus-opacity', this.update_focused_window_opacity);
    settings.on('special-opacity', this.update_special_focused_window_opacity);
    settings.on('inactive-opacity', this.update_inactive_windows_opacity);
    settings.on('is-background-blur', this.update_is_background_blur);
    settings.on('is-desaturate-enabled', this.update_is_desaturate_enabled);
    settings.on('desaturate-percentage', this.update_desaturate_percentage);
  }

  static get_opacity_targets(window_actor: Meta.WindowActor): Clutter.Actor[] {
    const targets = window_actor.get_children();
    return targets.length > 0 ? targets : [window_actor];
  }

  private get_owned_window_state(window_actor: Meta.WindowActor): OwnedWindowState {
    const existing_state = this.owned_window_states.get(window_actor);
    if (existing_state) {
      return existing_state;
    }

    const state: OwnedWindowState = { opacities: new Map() };
    this.owned_window_states.set(window_actor, state);
    signal_tracked(window_actor).connectObject(
      'destroy',
      (actor: Meta.WindowActor) => {
        for (const opacity_actor of state.opacities.keys()) {
          signal_tracked(opacity_actor).disconnectObject(state);
        }
        state.opacities.clear();
        this.owned_window_states.delete(actor);
        if (this.active_window_actor === actor) {
          delete this.active_window_actor;
        }
      },
      this
    );
    return state;
  }

  private restore_window_actor(window_actor: Meta.WindowActor): void {
    const state = this.owned_window_states.get(window_actor);
    if (!state) {
      return;
    }

    if (!window_actor.is_destroyed()) {
      for (const [actor, opacity] of state.opacities) {
        if (actor.get_opacity() === opacity.applied) {
          actor.set_opacity(opacity.original);
        }
        signal_tracked(actor).disconnectObject(state);
      }

      if (state.blur_effect && window_actor.get_effect(BLUR_EFFECT_NAME) === state.blur_effect) {
        window_actor.remove_effect(state.blur_effect);
      }
      if (state.desaturate_effect && window_actor.get_effect(DESATURATE_EFFECT_NAME) === state.desaturate_effect) {
        window_actor.remove_effect(state.desaturate_effect);
      }

      signal_tracked(window_actor).disconnectObject(this);
    }

    this.owned_window_states.delete(window_actor);
    if (this.active_window_actor === window_actor) {
      delete this.active_window_actor;
    }
  }

  clear_active_window = (set_inactive = true): void => {
    if (!this.active_window_actor) {
      return;
    }

    if (set_inactive) {
      this.update_inactive_window_actor(this.active_window_actor);
    }

    delete this.active_window_actor;
  };

  is_special = (window_actor: Meta.WindowActor): boolean => {
    if (!this.special_focus || window_actor.is_destroyed()) {
      return false;
    }

    const window = window_actor.get_meta_window();
    return (
      !!window &&
      is_valid_window_type(window) &&
      this.special_focus.some(
        criteria =>
          criteria === window.get_wm_class() ||
          criteria === window.get_wm_class_instance() ||
          criteria === window.get_title()
      )
    );
  };

  is_ignored = (window_actor: Meta.WindowActor): boolean => {
    if (window_actor.is_destroyed()) {
      return true;
    }

    const window = window_actor.get_meta_window();
    if (window && is_desktop_icons_window(window)) {
      return true;
    }

    if (!this.ignore_inactive) {
      return false;
    }

    return (
      !!window &&
      (!is_valid_window_type(window) ||
        this.ignore_inactive.some(
          criteria =>
            criteria === window.get_wm_class() ||
            criteria === window.get_wm_class_instance() ||
            criteria === window.get_title()
        ))
    );
  };

  set_opacity(window_actor: Meta.WindowActor, percentage: number): void {
    if (window_actor.is_destroyed()) {
      return;
    }

    const true_opacity = (DEFAULT_OPACITY * percentage) / 100;
    for (const actor of GnomeFocusManager.get_opacity_targets(window_actor)) {
      const original_opacity = actor.get_opacity();
      if (original_opacity === true_opacity) {
        continue;
      }

      const state = this.get_owned_window_state(window_actor);
      const opacity = state.opacities.get(actor);
      actor.set_opacity(true_opacity);
      if (opacity) {
        opacity.applied = actor.get_opacity();
      } else {
        state.opacities.set(actor, {
          original: original_opacity,
          applied: actor.get_opacity()
        });
        signal_tracked(actor).connectObject('destroy', () => state.opacities.delete(actor), state);
      }
    }
  }

  set_blur(window_actor: Meta.WindowActor, blur: boolean): void {
    if (window_actor.is_destroyed()) {
      return;
    }

    const state = this.owned_window_states.get(window_actor);
    if (!blur) {
      if (state?.blur_effect && window_actor.get_effect(BLUR_EFFECT_NAME) === state.blur_effect) {
        window_actor.remove_effect(state.blur_effect);
      }
      if (state) {
        delete state.blur_effect;
      }
      return;
    }

    if (state?.blur_effect) {
      if (window_actor.get_effect(BLUR_EFFECT_NAME) === state.blur_effect) {
        state.blur_effect.set_enabled(true);
        return;
      }
      delete state.blur_effect;
    }

    const meta_window = window_actor.get_meta_window();
    if (!meta_window || !is_valid_window_type(meta_window)) {
      return;
    }
    if (window_actor.get_effect(BLUR_EFFECT_NAME)) {
      return;
    }

    const blur_effect = Clutter.BlurEffect.new();
    window_actor.add_effect_with_name(BLUR_EFFECT_NAME, blur_effect);
    this.get_owned_window_state(window_actor).blur_effect = blur_effect;
  }

  set_desaturate(window_actor: Meta.WindowActor, desaturate: boolean, percentage: number): void {
    if (window_actor.is_destroyed()) {
      return;
    }

    const state = this.owned_window_states.get(window_actor);
    if (!desaturate) {
      if (
        state?.desaturate_effect &&
        window_actor.get_effect(DESATURATE_EFFECT_NAME) === state.desaturate_effect
      ) {
        window_actor.remove_effect(state.desaturate_effect);
      }
      if (state) {
        delete state.desaturate_effect;
      }
      return;
    }

    if (state?.desaturate_effect) {
      if (window_actor.get_effect(DESATURATE_EFFECT_NAME) === state.desaturate_effect) {
        state.desaturate_effect.set_factor(percentage / 100);
        state.desaturate_effect.set_enabled(true);
        return;
      }
      delete state.desaturate_effect;
    }

    const meta_window = window_actor.get_meta_window();
    if (!meta_window || !is_valid_window_type(meta_window)) {
      return;
    }
    if (window_actor.get_effect(DESATURATE_EFFECT_NAME)) {
      return;
    }

    const desaturate_effect = Clutter.DesaturateEffect.new(percentage / 100);
    window_actor.add_effect_with_name(DESATURATE_EFFECT_NAME, desaturate_effect);
    this.get_owned_window_state(window_actor).desaturate_effect = desaturate_effect;
    desaturate_effect.set_factor(percentage / 100);
  }

  update_inactive_window_actor = (window_actor: Meta.WindowActor): void => {
    if (window_actor.is_destroyed() || this.is_ignored(window_actor)) {
      return;
    }

    this.set_opacity(window_actor, this.settings.inactive_opacity);
    this.set_blur(window_actor, this.settings.is_background_blur);
    this.set_desaturate(window_actor, this.settings.is_desaturate_enabled, this.settings.desaturate_percentage);
  };

  set_active_window_actor = (window_actor: Meta.WindowActor): void => {
    if (this.active_window_actor === window_actor) {
      return;
    }

    this.clear_active_window();

    if (window_actor.is_destroyed() || this.is_ignored(window_actor)) {
      delete this.active_window_actor;
      return;
    }

    this.active_window_actor = window_actor;
    this.get_owned_window_state(window_actor);
    const opacity = this.is_special(this.active_window_actor)
      ? this.settings.special_focus_opacity
      : this.settings.focus_opacity;

    this.set_opacity(this.active_window_actor, opacity);
    this.set_blur(this.active_window_actor, false);
    this.set_desaturate(this.active_window_actor, false, this.settings.desaturate_percentage);
  };

  update_special_focused_window_opacity = (value: number): void => {
    if (undefined === this.active_window_actor || !this.is_special(this.active_window_actor)) {
      return;
    }

    this.set_opacity(this.active_window_actor, value);
  };

  update_focused_window_opacity = (value: number): void => {
    if (undefined === this.active_window_actor || this.is_special(this.active_window_actor)) {
      return;
    }

    this.set_opacity(this.active_window_actor, value);
  };

  update_inactive_windows_opacity = (value: number): void => {
    for (const window_actor of global.get_window_actors()) {
      if (window_actor === this.active_window_actor || this.is_ignored(window_actor)) {
        continue;
      }

      this.set_opacity(window_actor, value);
    }
  };

  update_is_background_blur = (blur: boolean): void => {
    for (const window_actor of global.get_window_actors()) {
      if (window_actor === this.active_window_actor || this.is_ignored(window_actor)) {
        continue;
      }

      this.set_blur(window_actor, blur);
    }
  };

  update_is_desaturate_enabled = (enabled: boolean): void => {
    const percentage = this.settings.desaturate_percentage;
    for (const window_actor of global.get_window_actors()) {
      if (window_actor === this.active_window_actor || this.is_ignored(window_actor)) {
        continue;
      }

      this.set_desaturate(window_actor, enabled, percentage);
    }
  };

  update_desaturate_percentage = (percentage: number): void => {
    const enabled = this.settings.is_desaturate_enabled;
    for (const window_actor of global.get_window_actors()) {
      if (window_actor === this.active_window_actor || this.is_ignored(window_actor)) {
        continue;
      }

      this.set_desaturate(window_actor, enabled, percentage);
    }
  };

  /** Reconciles ready window actors with Mutter's current focus state. */
  refresh = (pending_window_actors?: ReadonlySet<Meta.WindowActor>): void => {
    const focused_window = global.display.focus_window;
    if (!focused_window) {
      return;
    }

    const window_actors = global.get_window_actors();
    const focused_actor = window_actors.find(
      window_actor =>
        !window_actor.is_destroyed() &&
        !pending_window_actors?.has(window_actor) &&
        window_actor.get_meta_window() === focused_window
    );

    // Focus can change before Mutter draws a new actor. Preserve the current
    // state until ::first-frame rather than partially applying a transition.
    if (!focused_actor) {
      return;
    }

    const focused_actor_is_ignored = this.is_ignored(focused_actor);
    if (!is_valid_window_type(focused_window) && !focused_actor_is_ignored) {
      return;
    }

    if (focused_actor_is_ignored) {
      this.restore_window_actor(focused_actor);
    }

    for (const window_actor of window_actors) {
      if (window_actor === focused_actor || pending_window_actors?.has(window_actor)) {
        continue;
      }

      this.update_inactive_window_actor(window_actor);
    }

    if (focused_actor_is_ignored) {
      this.clear_active_window(false);
      return;
    }

    this.set_active_window_actor(focused_actor);
  };

  disable(): void {
    this.settings.clear();
    this.clear_active_window(false);

    for (const window_actor of [...this.owned_window_states.keys()]) {
      this.restore_window_actor(window_actor);
    }
  }
}
