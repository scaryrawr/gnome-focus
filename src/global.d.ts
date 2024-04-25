import '@girs/gjs';
import '@girs/gjs/dom';
import '@girs/gnome-shell/ambient';

import Shell from '@girs/shell-14';
import Meta from '@girs/meta-14';

declare global {
  var get_window_actors: Shell.Global['get_window_actors'];
  var display: Meta.Display;
}
