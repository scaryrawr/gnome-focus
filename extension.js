'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

// 100%
const DEFAULT_OPACITY = 255;

let create_signal = undefined;
let settings = undefined;
let special = undefined;

function init() {
}

function set_opacity(actor, value) {
	for (const child of actor.get_children())
	{
		if (child.set_opacity) {
			child.set_opacity(value);
		}
	}

	if (actor.set_opacity) {
		actor.set_opacity(value);
	}
}

function translate_opacity(percentage) {
	return DEFAULT_OPACITY * percentage / 100;
}

function focus(win) {
	if (!settings) {
		return;
	}

	const focus_opacity = translate_opacity(settings.focus_opacity)
	const inactive_opacity = translate_opacity(settings.inactive_opacity);
	const special_opacity = translate_opacity(settings.special_focus_opacity);

	for (const actor of global.get_window_actors()) {
		const meta_win = actor.get_meta_window();
		const wm_class = meta_win.get_wm_class();
		if (wm_class == 'Gnome-shell') {
			continue;
		}

		set_opacity(actor, (meta_win === win || meta_win.is_fullscreen()) ?
			(special && special.includes(wm_class)) ? special_opacity : focus_opacity
			: inactive_opacity);
	}
}

function enable() {
	log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

	settings = Settings.get_settings();

	create_signal = global.display.connect('window-created', function(_, win) {
		win._gnome_focus_signal = win.connect('focus', focus);
	});

	const special_file = GLib.build_filenamev([GLib.get_user_config_dir(), Me.metadata.name, 'special_focus.json']);
	try {
		const load_config = GLib.file_get_contents(special_file);
		if (load_config[0]) {
			special = JSON.parse(load_config[1]);
			for (const spec of special) {
				log(`special opacity for ${spec}`);
			}
		}
	} catch (error) {
		log(`${Me.metadata.name}: ${error}`);
	}

	const inactive_opacity = translate_opacity(settings.inactive_opacity);

	for (const actor of global.get_window_actors()) {
		const win = actor.get_meta_window();
		if (!win._gnome_focus_signal) {
			win._gnome_focus_signal = win.connect('focus', focus);
		}

		if (win !== global.display.focus_window) {
			set_opacity(actor, inactive_opacity);
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
		if (win && win._gnome_focus_signal) {
			win.disconnect(win._gnome_focus_signal);
			delete win._gnome_focus_signal;
		}

		set_opacity(actor, DEFAULT_OPACITY);
	}

	special = undefined;
	settings = undefined;
}
