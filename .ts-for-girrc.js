module.exports = {
  pretty: false,
  environments: ['gjs'],
  outdir: './gir/@types',
  girDirectories: ['/usr/share/gir-1.0', '/usr/share/gnome-shell', '/usr/lib64/mutter-10'],
  modules: ['GLib-2.0', 'Shell-0.1', 'St-1.0', 'Meta-10', 'Gio-2.0', 'Gdk-4.0', 'Gtk-4.0'],
  ignore: [],
};
