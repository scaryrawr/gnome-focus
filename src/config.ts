import type { ExtensionMetadata } from '@girs/gnome-shell/extensions/extension';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

Gio._promisify(Gio.File.prototype, 'load_contents_async');

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

export async function load_config<T>(metadata: ExtensionMetadata, name: string): Promise<T | undefined> {
  const file_path = get_config_path(metadata, name);
  const file = Gio.File.new_for_path(file_path);

  try {
    const [content] = await file.load_contents_async(null);
    return JSON.parse(new TextDecoder().decode(content));
  } catch (error) {
    if (!(error instanceof GLib.Error) || !error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) {
      console.warn(`Failed to load ${name}: ${error}`);
    }
    return undefined;
  }
}
