'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Settings = Me.imports.settings;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

function init() {
}

function buildPrefsWidget() {
    const settings = Settings.get_settings();

    const widget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    const title = new Gtk.Label({
        label: '<b>' + Me.metadata.name + ' Extension Preferences</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });

    widget.attach(title, 0, 0, 2, 1);

    const focus_opacity_label = new Gtk.Label({
        label: 'Focus Opacity',
        halign: Gtk.Align.START,
        visible: true
    });

    const focus_opacity_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 50, 100, 1);
    focus_opacity_scale.set_value(settings.focus_opacity);
    focus_opacity_scale.connect('change-value', function () {
        settings.set_focus_opacity(focus_opacity_scale.get_value());
        Gio.Settings.sync();
    });

    focus_opacity_scale.set_visible(true);

    widget.attach(focus_opacity_label, 0, 1, 1, 1);
    widget.attach(focus_opacity_scale, 1, 1, 1, 1);

    const inactive_opacity_label = new Gtk.Label({
        label: 'Inactive Opacity',
        halign: Gtk.Align.START,
        visible: true
    });

    const inactive_opacity_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 50, 100, 1);
    inactive_opacity_scale.set_value(settings.inactive_opacity);
    inactive_opacity_scale.connect('change-value', function () {
        settings.set_inactive_opacity(inactive_opacity_scale.get_value());
        Gio.Settings.sync();
    });

    inactive_opacity_scale.set_visible(true);

    widget.attach(inactive_opacity_label, 0, 2, 1, 1);
    widget.attach(inactive_opacity_scale, 1, 2, 1, 1);

    const special_focus_opacity_label = new Gtk.Label({
        label: 'Special Focus Opacity',
        halign: Gtk.Align.START,
        visible: true
    });

    const special_focus_opacity_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 50, 100, 1);
    special_focus_opacity_scale.set_value(settings.special_focus_opacity);
    special_focus_opacity_scale.connect('change-value', function () {
        settings.set_special_focus_opacity(special_focus_opacity_scale.get_value());
        Gio.Settings.sync();
    });

    special_focus_opacity_scale.set_visible(true);

    widget.attach(special_focus_opacity_label, 0, 3, 1, 1);
    widget.attach(special_focus_opacity_scale, 1, 3, 1, 1);

    return widget;
}
