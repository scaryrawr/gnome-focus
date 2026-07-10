# Repository Guidelines

## Project Structure & Module Organization

- `src/extension.ts` is the GNOME Shell extension entrypoint; `src/prefs.ts` builds the GTK preferences UI.
- `src/GnomeFocusManager.ts` owns window effects. `src/settings.ts` wraps GSettings; `src/config.ts` loads optional user JSON lists.
- `schemas/org.gnome.shell.extensions.focus.gschema.xml` is the source of extension settings. Keep schema keys, `FocusSettings`, and preferences controls synchronized.
- `metadata.json` declares the UUID and Shell versions. Builds add the description and derive the extension version from `package.json`'s minor version.
- `dist/`, `schemas/gschemas.compiled`, and `focus@scaryrawr.github.io.zip` are generated; never edit or commit them.

## Build, Test, and Development Commands

Use Node 22 and Yarn 1, matching CI.

- `yarn install` installs the locked dependencies.
- `yarn lint` is the fastest validation command and checks all TypeScript.
- `yarn build` runs lint, bundles both entrypoints with Rollup, and copies metadata and schemas into `dist/`.
- `yarn build:package` performs a clean build and creates the uploadable extension ZIP; this is the pull-request CI check.
- `yarn package:install` builds and replaces the local extension at `~/.local/share/gnome-shell/extensions/focus@scaryrawr.github.io`.

There is no automated test suite. For runtime changes, lint and package first, then verify behavior in a compatible GNOME Shell session.

## Coding Style & Naming Conventions

TypeScript is strict. Prettier uses single quotes, no trailing commas, and a 120-column width. ESLint requires `snake_case` for variables and functions, `UPPER_CASE` for constants, and `PascalCase` for classes. Source imports use `.js` extensions because Rollup emits ES modules for GJS.

Treat the entrypoints as separate processes: Shell code may import `Clutter`, `Meta`, `Shell`, and `St`, while preferences may import GTK4 and Adwaita. Never cross those library sets.

Module loading and extension construction must create only static JavaScript data. Create GObjects, connect signals, and add main-loop sources in `enable()`; destroy or disconnect all of them in `disable()`, even self-removing sources. Drop references, restore window effects, and cancel or invalidate asynchronous work so it cannot mutate state after disable.

Only list GNOME Shell versions that were tested. Prefer stable GNOME platform APIs and feature detection over version checks or patches of Shell internals.

## Commit & Pull Request Guidelines

Use concise, imperative, sentence-case commit subjects. PRs should explain user-visible GNOME behavior, note supported shell-version changes, and pass `yarn build:package`. Tags matching `v*` publish the generated ZIP through GitHub Actions.

## Agent Skills

- `gnome-extension-review` — audit lifecycle, compatibility, settings, packaging, and runtime behavior before an EGO submission or after extension-facing changes.
