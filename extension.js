"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

//! 100% opacity
const DEFAULT_OPACITY = 255;

//! Signal marker for when a new window is created
let create_signal = undefined;

//! Settings Object for getting opacity values
let settings = undefined;

//! List of WM_CLASSes that should have **some** opacity even when focused
let special_focus_list = undefined;

//! List of WM_CLASSes that should not have opacity modified
let ignore_focus_list = undefined;

//! List of WM_CLASSes that shouldn't be messed with that may lead to undesirable UI experiences
const DO_NOT_TOUCH_LIST = ["Gnome-shell"];

function init() {}

function set_opacity(win, actor, value) {
  if (
    DO_NOT_TOUCH_LIST.includes(win.get_wm_class()) ||
    (ignore_focus_list &&
      (ignore_focus_list.includes(win.get_wm_class()) ||
        ignore_focus_list.includes(win.get_wm_class_instance())))
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

function translate_opacity(percentage) {
  return (DEFAULT_OPACITY * percentage) / 100;
}

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
        ? (special_focus_list &&
            special_focus_list.includes(meta_win.get_wm_class())) ||
          special_focus_list.includes(meta_win.get_wm_class_instance())
          ? special_opacity
          : focus_opacity
        : inactive_opacity
    );
  }
}

function enable() {
  log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

  settings = Settings.get_settings();

  create_signal = global.display.connect("window-created", function (_, win) {
    win._focus_extension_signal = win.connect("focus", focus_changed);
  });

  const special_file = GLib.build_filenamev([
    GLib.get_user_config_dir(),
    Me.metadata.name,
    "special_focus.json",
  ]);
  try {
    const special_focus_load = GLib.file_get_contents(special_file);
    if (special_focus_load[0]) {
      special_focus_list = JSON.parse(special_focus_load[1]);
    }
  } catch (error) {
    log(`${Me.metadata.name}: failed to load special focus file ${error}`);
  }

  const ignore_file = GLib.build_filenamev([
    GLib.get_user_config_dir(),
    Me.metadata.name,
    "ignore_focus.json",
  ]);
  try {
    const ignore_focus_load = GLib.file_get_contents(ignore_file);
    if (ignore_focus_load[0]) {
      ignore_focus_list = JSON.parse(ignore_focus_load[1]);
    }
  } catch (error) {
    log(`${Me.metadata.name}: Failed to load ignore file ${error}`);
  }

  const inactive_opacity = translate_opacity(settings.inactive_opacity);

  for (const actor of global.get_window_actors()) {
    const win = actor.get_meta_window();
    if (!win._focus_extension_signal) {
      win._focus_extension_signal = win.connect("focus", focus_changed);
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
    const win = actor.get_meta_window();
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
