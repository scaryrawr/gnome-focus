---
name: gnome-extension-review
description: Audit or prepare this GNOME Shell extension for extensions.gnome.org review. Use after changing extension lifecycle, asynchronous work, signals, GLib sources, preferences, GSettings, supported Shell versions, packaging, or before a release or EGO submission.
---

# GNOME Extension Review

Review the current change against repository conventions and GNOME Shell extension requirements. Fix issues when the task permits; otherwise report concrete violations with file and line references. Do not replace repository commands with generic GNOME examples.

## Inspect the change

Fetch the current [GNOME Shell Extensions Review Guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html) before each audit and treat them as authoritative; this skill is only an operational checklist. Read `AGENTS.md`, `metadata.json`, `package.json`, the changed source files, and the generated archive inputs. Classify each change as Shell runtime, preferences, settings/schema, compatibility, legal/external behavior, or packaging. Distinguish mandatory (`MUST`/`MUST NOT`) findings from recommendations and functional-quality risks.

## Audit lifecycle ownership

Build a resource ledger for every changed GObject, signal, GLib source, window effect, and asynchronous operation:

1. Confirm module scope and constructors create only static JavaScript data. Dynamic objects, signals, Shell mutations, and sources belong in `enable()`.
2. Pair every object or effect created in `enable()` with destruction or restoration in `disable()`.
3. Pair every signal connection with disconnection. In `extension.js`, use `connectObject()` and `disconnectObject()` directly on supported Shell objects. In `prefs.js` and shared preferences modules, use `connect()` and retain the signal ID for `disconnect()`.
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

## Audit the remaining official rules

- Reject deprecated `ByteArray`, `Lang`, and `Mainloop` imports, unjustified `run_dispose()`, excessive logging, telemetry, and extension-system interference.
- Flag binaries and external scripts, unsafe or privileged subprocesses, dependency installation without explicit user action, and clipboard access not declared in the extension description.
- Validate minimal metadata: UUID namespace, description, URL, stable/non-future Shell versions, and only necessary `session-modes` or donation keys.
- Confirm GPL-compatible distribution terms and attribution for copied extension code; flag unlicensed copyrighted or trademarked assets.
- Confirm the extension is functional and contains no unnecessary or unexplained generated code. Large, inconsistent, imaginary, or prompt-like code is a review risk.

## Validate and inspect packaging

Run:

```sh
pnpm lint
pnpm build:package
unzip -l focus@scaryrawr.github.io.zip

python -m venv .venv-shexli
. .venv-shexli/bin/activate
python -m pip install -U shexli
shexli --format json focus@scaryrawr.github.io.zip
```

Run Shexli against the exact ZIP, not only `src/` or `dist/`, and record its version, exit status, finding count, severities, and target Shell versions. If Shexli 0.2.1 installs `tree-sitter` 0.26.0 and segfaults, pin `tree-sitter==0.25.2` with `tree-sitter-javascript==0.25.0` in the disposable environment and rerun; this is a tool compatibility issue, not a clean or failed extension result. Pass an absolute path when analyzing a directory because Shexli 0.2.1 can fail on relative directory paths.

Extract the archive and audit the exact submitted files. Confirm it contains only runtime files, readable non-minified JavaScript, metadata, and schema sources. It must not contain TypeScript sources, build/install scripts, dependencies, binaries, `.po`/`.pot` files, compiled schemas, unused media, or unrelated assets. Check bundled imports and lifecycle calls because reviewers see generated JavaScript, and compare extracted files byte-for-byte with `dist/`.

Finish with an evidence ledger covering initialization/lifecycle, signal/source cleanup, process boundaries, deprecated/dangerous APIs, logging, external behavior, metadata, schemas, legal/attribution, package contents/readability, build checks, and runtime checks. Include clean categories and clearly state any runtime checks that could not be performed; a clean linter or Shexli result is not sufficient.

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
