import type { ExtensionMetadata } from '@girs/gnome-shell/extensions/extension';
import GLib from 'gi://GLib';

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

export function load_config<T>(metadata: ExtensionMetadata, name: string): T | undefined {
  const file_path = get_config_path(metadata, name);
  if (!GLib.file_test(file_path, GLib.FileTest.IS_REGULAR)) {
    return undefined;
  }

  const [loaded, content] = GLib.file_get_contents(file_path);
  if (!loaded) {
    return undefined;
  }

  try {
    return JSON.parse(new TextDecoder().decode(content));
  } catch {
    return undefined;
  }
}

export function write_config<T>(metadata: ExtensionMetadata, name: string, data: T): boolean {
  const write_data = new TextEncoder().encode(JSON.stringify(data, null, 2));
  const file_path = get_config_path(metadata, name);
  return GLib.file_set_contents(file_path, write_data);
}
