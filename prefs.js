"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Settings = Me.imports.settings;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

function init() {}

function buildPrefsWidget() {
  const settings = Settings.get_settings();

  const widget = new Gtk.Grid({
    margin: 18,
    column_spacing: 12,
    row_spacing: 12,
    visible: true,
  });

  const title = new Gtk.Label({
    label: "<b>" + Me.metadata.name + " Extension Preferences</b>",
    halign: Gtk.Align.START,
    use_markup: true,
    visible: true,
  });

  widget.attach(title, 0, 0, 2, 1);

  const focus_opacity_label = new Gtk.Label({
    label: "Focus Opacity",
    halign: Gtk.Align.START,
    visible: true,
  });

  const focus_opacity_entry = new Gtk.Entry({
    input_purpose: Gtk.InputPurpose.NUMBER,
    visible: true,
  });

  focus_opacity_entry.set_text(settings.focus_opacity.toString());
  focus_opacity_entry.connect("changed", function () {
    const value = parseInt(focus_opacity_entry.text);
    if (!isNaN(value) && value <= 100 && value >= 0) {
      settings.set_focus_opacity(value);
      Gio.Settings.sync();
    }
  });

  widget.attach(focus_opacity_label, 0, 1, 1, 1);
  widget.attach(focus_opacity_entry, 1, 1, 1, 1);

  const inactive_opacity_label = new Gtk.Label({
    label: "Inactive Opacity",
    halign: Gtk.Align.START,
    visible: true,
  });

  const inactive_opacity_entry = new Gtk.Entry({
    input_purpose: Gtk.InputPurpose.NUMBER,
    visible: true,
  });

  inactive_opacity_entry.set_text(settings.inactive_opacity.toString());
  inactive_opacity_entry.connect("changed", function () {
    const value = parseInt(inactive_opacity_entry.text);
    if (!isNaN(value) && value <= 100 && value >= 0) {
      settings.set_inactive_opacity(value);
      Gio.Settings.sync();
    }
  });

  widget.attach(inactive_opacity_label, 0, 2, 1, 1);
  widget.attach(inactive_opacity_entry, 1, 2, 1, 1);

  const special_focus_opacity_label = new Gtk.Label({
    label: "Special Focus Opacity",
    halign: Gtk.Align.START,
    visible: true,
  });

  const special_focus_opacity_entry = new Gtk.Entry({
    input_purpose: Gtk.InputPurpose.NUMBER,
    visible: true,
  });

  special_focus_opacity_entry.set_text(
    settings.special_focus_opacity.toString()
  );
  special_focus_opacity_entry.connect("changed", function () {
    const value = parseInt(special_focus_opacity_entry.text);
    if (!isNaN(value) && value <= 100 && value >= 0) {
      settings.set_special_focus_opacity(value);
      Gio.Settings.sync();
    }
  });

  widget.attach(special_focus_opacity_label, 0, 3, 1, 1);
  widget.attach(special_focus_opacity_entry, 1, 3, 1, 1);

  return widget;
}
