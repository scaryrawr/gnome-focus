---
name: gnome-extension-review
description: Audit or prepare this GNOME Shell extension for extensions.gnome.org review. Use after changing extension lifecycle, asynchronous work, signals, GLib sources, preferences, GSettings, supported Shell versions, packaging, or before a release or EGO submission.
---

# GNOME Extension Review

Review the current change against repository conventions and GNOME Shell extension requirements. Fix issues when the task permits; otherwise report concrete violations with file and line references. Do not replace repository commands with generic GNOME examples.

## Inspect the change

Read `AGENTS.md`, `metadata.json`, `package.json`, the changed source files, and the generated archive inputs. Classify each change as Shell runtime, preferences, settings/schema, compatibility, or packaging.

## Audit lifecycle ownership

Build a resource ledger for every changed GObject, signal, GLib source, window effect, and asynchronous operation:

1. Confirm module scope and constructors create only static JavaScript data. Dynamic objects, signals, Shell mutations, and sources belong in `enable()`.
2. Pair every object or effect created in `enable()` with destruction or restoration in `disable()`.
3. Pair every signal connection with disconnection. Prefer the repository's `signal_tracked(...).connectObject()` and matching `disconnectObject()`.
4. Remove every GLib source explicitly during disable, even when its callback normally returns `GLib.SOURCE_REMOVE`.
5. Drop JavaScript references after cleanup to prevent leaks and use-after-free behavior.
6. Cancel GIO operations with `Gio.Cancellable` when practical. Otherwise use a generation or enabled-state guard and ensure completion cannot mutate disabled state.
7. Exercise at least one enable-disable-enable cycle; cleanup must be idempotent.

## Enforce process boundaries

- `extension.ts` runs inside `gnome-shell`: do not import `Gtk`, `Gdk`, or `Adw`.
- `prefs.ts` runs in a separate GJS process: do not import `Clutter`, `Meta`, `Shell`, or `St`.
- Keep shared modules free of imports that violate either consumer's process.
- Keep logging limited to actionable warnings and errors.

## Check compatibility and settings

- Verify each changed API across every release in `metadata.json`'s `shell-version`; never add an untested or future release.
- Prefer stable GLib, GObject, Gio, Clutter, Mutter, St, and Shell APIs. Prefer feature detection over version checks and avoid patching internal Shell methods.
- Keep the schema ID, path, filename, `metadata.json` `settings-schema`, `FocusSettings`, and preferences controls synchronized.
- Preserve GSettings value types, defaults, ranges, and live-change behavior.
- Keep the schema XML in the packaged `schemas/` directory.

## Validate and inspect packaging

Run:

```sh
pnpm lint
pnpm build:package
unzip -l focus@scaryrawr.github.io.zip
```

Confirm the archive contains only runtime files, readable non-minified JavaScript, metadata, and schema sources. It must not contain TypeScript sources, build scripts, dependencies, binaries, or unrelated assets.

## Perform GNOME runtime checks

When a compatible GNOME session is available:

```sh
pnpm package:install
gnome-extensions prefs focus@scaryrawr.github.io
journalctl -f -o cat /usr/bin/gnome-shell
journalctl -f -o cat /usr/bin/gjs
```

Restart GNOME Shell to load changed JavaScript. Wayland requires logging out and back in or a nested Shell; X11 can use the built-in `restart` command. Verify focus transitions, opacity/effects cleanup, live settings changes, both JSON lists, preferences startup, and repeated enable/disable.

## Authoritative references

- https://gjs.guide/extensions/review-guidelines/review-guidelines.html
- https://gjs.guide/extensions/development/preferences.html
- https://gjs.guide/extensions/development/debugging.html
- https://gjs.guide/extensions/development/targeting-older-gnome.html
- https://gjs.guide/guides/gjs/asynchronous-programming.html
- https://gjs.guide/guides/gjs/memory-management.html
