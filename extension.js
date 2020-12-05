'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Roughly 80%
const INACTIVE_OPACITY = 200;

// 100%
const FOCUS_OPACITY = 255;

let create_signal = undefined;

function init() {
}

function set_opacity(actor, value)
{
	for (const child of actor.get_children())
	{
		child.set_opacity(value);
	}

	actor.set_opacity(value);
}

function focus(win)
{
	for (const actor of global.get_window_actors()) {
		set_opacity(actor, (actor.get_meta_window() === win) ? FOCUS_OPACITY : INACTIVE_OPACITY);
	}
}

function enable() {
	log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

	create_signal = global.display.connect('window-created', function(_, win) {
		win._gnome_focus_signal = win.connect('focus', focus);
	});

	for (const actor of global.get_window_actors()) {
		const win = actor.get_meta_window();
		if (!win._gnome_focus_signal) {
			win._gnome_focus_signal = win.connect('focus', focus);
		}

		if (win !== global.display.focus_window) {
			set_opacity(actor, INACTIVE_OPACITY);
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

		set_opacity(actor, FOCUS_OPACITY);
	}
}
