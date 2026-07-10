import type { Extension } from '@girs/gnome-shell/extensions/extension';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

type ExtensionMetadata = Extension['metadata'];

let load_contents_promisified = false;

function ensure_async_file_loading(): void {
  if (load_contents_promisified) {
    return;
  }

  Gio._promisify(Gio.File.prototype, 'load_contents_async');
  load_contents_promisified = true;
}

function get_configuration_dir(metadata: ExtensionMetadata) {
  const config_dir = GLib.build_filenamev([GLib.get_user_config_dir(), metadata.uuid]);
  if (GLib.file_test(config_dir, GLib.FileTest.IS_DIR)) {
    return config_dir;
  }

  // Legacy configuration location
  return GLib.build_filenamev([GLib.get_user_config_dir(), metadata.name]);
}

function get_config_path(metadata: ExtensionMetadata, name: string) {
  return GLib.build_filenamev([get_configuration_dir(metadata), name]);
}

/** Loads an optional JSON configuration file, honoring extension shutdown. */
export async function load_config<T>(
  metadata: ExtensionMetadata,
  name: string,
  cancellable: Gio.Cancellable
): Promise<T | undefined> {
  ensure_async_file_loading();

  const file_path = get_config_path(metadata, name);
  const file = Gio.File.new_for_path(file_path);

  try {
    const [content] = await file.load_contents_async(cancellable);
    return JSON.parse(new TextDecoder().decode(content));
  } catch (error) {
    const expected_io_error =
      error instanceof GLib.Error &&
      (error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND) ||
        error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED));

    if (!expected_io_error) {
      console.warn(`Failed to load ${name}: ${error}`);
    }
    return undefined;
  }
}
