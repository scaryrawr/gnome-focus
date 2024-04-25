const GLib = imports.gi.GLib;
import * as Me from '../metadata.json';
const { byteArray } = imports;

function get_configuration_dir() {
  const config_dir = GLib.build_filenamev([GLib.get_user_config_dir(), Me.default.uuid]);
  if (GLib.file_test(config_dir, GLib.FileTest.IS_DIR)) {
    return config_dir;
  }

  // Legacy configuration location
  return GLib.build_filenamev([GLib.get_user_config_dir(), Me.default.name]);
}

function get_config_path(name: string) {
  return GLib.build_filenamev([get_configuration_dir(), name]);
}

export function load_config<T>(name: string): T | undefined {
  const file_path = get_config_path(name);
  if (!GLib.file_test(file_path, GLib.FileTest.IS_REGULAR)) {
    return undefined;
  }

  const [loaded, content] = GLib.file_get_contents(file_path);
  if (!loaded) {
    return undefined;
  }

  try {
    return JSON.parse(byteArray.toString(content));
  } catch {
    return undefined;
  }
}

export function write_config<T>(name: string, data: T): boolean {
  const write_data = byteArray.fromString(JSON.stringify(data, null, 2));
  const file_path = get_config_path(name);
  return GLib.file_set_contents(file_path, write_data);
}
