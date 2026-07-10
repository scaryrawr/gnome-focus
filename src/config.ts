import type { Extension } from '@girs/gnome-shell/extensions/extension';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

type ExtensionMetadata = Extension['metadata'];

let file_operations_promisified = false;

type ConfigName = 'special_focus.json' | 'ignore_focus.json';

function ensure_async_file_operations(): void {
  if (file_operations_promisified) {
    return;
  }

  Gio._promisify(Gio.File.prototype, 'query_info_async');
  Gio._promisify(Gio.File.prototype, 'load_contents_async');
  file_operations_promisified = true;
}

function is_io_error(error: unknown, code: number): boolean {
  return error instanceof GLib.Error && error.matches(Gio.IOErrorEnum, code);
}

async function get_configuration_dir(
  metadata: ExtensionMetadata,
  cancellable: Gio.Cancellable
): Promise<string | undefined> {
  const config_dir = GLib.get_user_config_dir();
  const preferred_dir = GLib.build_filenamev([config_dir, metadata.uuid]);
  const legacy_dir = GLib.build_filenamev([config_dir, metadata.name]);
  const preferred_file = Gio.File.new_for_path(preferred_dir);

  try {
    const info = await preferred_file.query_info_async(
      Gio.FILE_ATTRIBUTE_STANDARD_TYPE,
      Gio.FileQueryInfoFlags.NONE,
      GLib.PRIORITY_DEFAULT,
      cancellable
    );
    if (cancellable.is_cancelled()) {
      return undefined;
    }
    return info.get_file_type() === Gio.FileType.DIRECTORY ? preferred_dir : legacy_dir;
  } catch (error) {
    if (is_io_error(error, Gio.IOErrorEnum.CANCELLED)) {
      return undefined;
    }
    if (!is_io_error(error, Gio.IOErrorEnum.NOT_FOUND)) {
      console.warn(`Failed to inspect configuration directory ${preferred_dir}: ${error}`);
    }
    return legacy_dir;
  }
}

function parse_config(content: Uint8Array, file_path: string): string[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(content));
  } catch (error) {
    console.warn(
      `Ignoring invalid configuration file ${file_path}: ${error}. Expected a JSON array containing only strings.`
    );
    return undefined;
  }

  if (!Array.isArray(parsed) || !parsed.every(value => typeof value === 'string')) {
    console.warn(`Ignoring invalid configuration file ${file_path}: expected a JSON array containing only strings.`);
    return undefined;
  }

  return parsed;
}

/** Loads an optional string-list configuration, preferring the UUID path over the legacy path. */
export async function load_config(
  metadata: ExtensionMetadata,
  name: ConfigName,
  cancellable: Gio.Cancellable
): Promise<string[] | undefined> {
  ensure_async_file_operations();

  const config_dir = await get_configuration_dir(metadata, cancellable);
  if (!config_dir || cancellable.is_cancelled()) {
    return undefined;
  }

  const file_path = GLib.build_filenamev([config_dir, name]);
  const file = Gio.File.new_for_path(file_path);
  try {
    const [content] = await file.load_contents_async(cancellable);
    if (cancellable.is_cancelled()) {
      return undefined;
    }
    return parse_config(content, file_path);
  } catch (error) {
    if (
      is_io_error(error, Gio.IOErrorEnum.CANCELLED) ||
      is_io_error(error, Gio.IOErrorEnum.NOT_FOUND)
    ) {
      return undefined;
    }

    console.warn(`Failed to read configuration file ${file_path}: ${error}`);
    return undefined;
  }
}
