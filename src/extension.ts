const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { byteArray } = imports;
const GLib = imports.gi.GLib;
const Meta = imports.gi.Meta;

import { Window, WindowActor } from '@imports/Meta-7';

import { FocusSettings, get_settings } from './settings';

/** 100% opacity value */
const DEFAULT_OPACITY = 255;

/** Signal marker for when a new window is created */
let create_signal: number | undefined = undefined;

/** Settings Object for getting opacity values */
let settings: FocusSettings | undefined;

/** List of WM_CLASSes that should have **some** opacity even when focused */
let special_focus_list: string[] | undefined;

/** List of WM_CLASSes that should not have opacity modified */
let ignore_focus_list: string[] | undefined;

/** Window Types that should be considered for focus changes */
const WINDOW_TYPES = [Meta.WindowType.NORMAL];

type ExtendedWindow = Window & {
  _focus_extension_signal?: number;
};

function set_opacity(win: Window, actor: WindowActor, value: number) {
  if (!WINDOW_TYPES.includes(win.window_type)) {
    return;
  }

  if (
    ignore_focus_list &&
    (ignore_focus_list.includes(win.get_wm_class()) ||
      ignore_focus_list.includes(win.get_wm_class_instance()) ||
      ignore_focus_list.includes(win.get_title()))
  ) {
    return;
  }

  for (const child of actor.get_children()) {
    if (child.set_opacity) {
      child.set_opacity(value);
    }
  }

  if (actor.set_opacity) {
    actor.set_opacity(value);
  }
}

/**
 * Converts the opacity percentage to value out of 255.
 * @param {number} percentage 0 - 100
 */
function translate_opacity(percentage: number) {
  return (DEFAULT_OPACITY * percentage) / 100;
}

/**
 * Updates opacity of windows after a focus change
 */
function focus_changed() {
  if (!settings) {
    return;
  }

  const focus_opacity = translate_opacity(settings.focus_opacity);
  const inactive_opacity = translate_opacity(settings.inactive_opacity);
  const special_opacity = translate_opacity(settings.special_focus_opacity);

  for (const actor of global.get_window_actors()) {
    const meta_win = actor.get_meta_window();
    set_opacity(
      meta_win,
      actor,
      meta_win.has_focus() || meta_win.is_fullscreen()
        ? special_focus_list &&
          (special_focus_list.includes(meta_win.get_wm_class()) ||
            special_focus_list.includes(meta_win.get_wm_class_instance()))
          ? special_opacity
          : focus_opacity
        : inactive_opacity
    );
  }
}

function enable() {
  log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

  settings = get_settings();

  create_signal = global.display.connect('window-created', function (_, win: ExtendedWindow) {
    if (!WINDOW_TYPES.includes(win.window_type)) {
      return;
    }

    win._focus_extension_signal = win.connect('focus', focus_changed);

    // In Wayland, when we have a new window, we need ot have a slight delay before
    // attempting to set the transparency.
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, function () {
      // We could have something go wrong, but always want to set false,
      // otherwise we end up being called more than once
      try {
        focus_changed();
      } catch (err) {
        log(`Error on new window: ${err}`);
      }

      return false;
    });
  });

  const special_file = GLib.build_filenamev([GLib.get_user_config_dir(), Me.metadata.name, 'special_focus.json']);
  try {
    const special_focus_load = GLib.file_get_contents(special_file);
    if (special_focus_load[0]) {
      special_focus_list = JSON.parse(byteArray.toString(special_focus_load[1]));
    }
  } catch (error) {
    log(`${Me.metadata.name}: failed to load special focus file ${error}`);
  }

  const ignore_file = GLib.build_filenamev([GLib.get_user_config_dir(), Me.metadata.name, 'ignore_focus.json']);
  try {
    const ignore_focus_load = GLib.file_get_contents(ignore_file);
    if (ignore_focus_load[0]) {
      ignore_focus_list = JSON.parse(byteArray.toString(ignore_focus_load[1]));
    }
  } catch (error) {
    log(`${Me.metadata.name}: Failed to load ignore file ${error}`);
  }

  const inactive_opacity = translate_opacity(settings?.inactive_opacity);

  for (const actor of global.get_window_actors()) {
    const win = actor.get_meta_window() as ExtendedWindow;
    if (!WINDOW_TYPES.includes(win.window_type)) {
      continue;
    }

    if (!win._focus_extension_signal) {
      win._focus_extension_signal = win.connect('focus', focus_changed);
    }

    if (!win.has_focus()) {
      set_opacity(win, actor, inactive_opacity);
    }
  }
}

function disable() {
  log(`disabling ${Me.metadata.name} version ${Me.metadata.version}`);

  if (create_signal) {
    global.display.disconnect(create_signal);
    create_signal = undefined;
  }

  for (const actor of global.get_window_actors()) {
    const win = actor.get_meta_window() as ExtendedWindow;
    if (win && win._focus_extension_signal) {
      win.disconnect(win._focus_extension_signal);
      delete win._focus_extension_signal;
    }
  }

  for (const actor of global.get_window_actors()) {
    set_opacity(actor.get_meta_window(), actor, DEFAULT_OPACITY);
  }

  special_focus_list = undefined;
  ignore_focus_list = undefined;
  settings = undefined;
}

export default function () {
  return {
    enable,
    disable,
  };
}
