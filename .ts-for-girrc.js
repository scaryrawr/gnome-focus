module.exports = {
  pretty: false,
  environments: ['gjs'],
  outdir: './gir/@types',
  girDirectories: ['/usr/share/gir-1.0', '/usr/share/gnome-shell', '/usr/lib64/mutter-7'],
  modules: ['GLib-2.0', 'Shell-0.1', 'St-1.0', 'Meta-7', 'Gio-2.0', 'Gdk-3.0', 'Gtk-3.0'],
  ignore: [],
};
