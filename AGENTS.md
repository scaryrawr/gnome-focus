# Repository Guidelines

## Project Structure & Module Organization

- `src/extension.ts` is the GNOME Shell extension entrypoint; `src/prefs.ts` builds the GTK preferences UI.
- `src/GnomeFocusManager.ts` owns window effects. `src/settings.ts` wraps GSettings; `src/config.ts` loads optional user JSON lists.
- `schemas/org.gnome.shell.extensions.focus.gschema.xml` is the source of extension settings. Keep schema keys, `FocusSettings`, and preferences controls synchronized.
- `metadata.json` declares the UUID and Shell versions. The build copies the description from `package.json` into the generated `dist/metadata.json`.
- `dist/`, `schemas/gschemas.compiled`, and `focus@scaryrawr.github.io.zip` are generated; never edit or commit them.

## Build, Test, and Development Commands

Use Node 22 and pnpm 11, matching CI. `package.json` pins the exact package-manager version; use pnpm for
all dependency and script commands.

- `pnpm install --frozen-lockfile` installs exactly the locked dependencies.
- `pnpm lint` runs Oxlint, the pinned native `tsgo` type checker, and Oxfmt's formatting check.
- `pnpm build` runs lint, bundles both entrypoints with Rolldown, and copies metadata and schemas into `dist/`.
- `pnpm build:package` performs a clean build and creates the uploadable extension ZIP; this is the pull-request CI check.
- `pnpm package:install` builds and replaces the local extension at `~/.local/share/gnome-shell/extensions/focus@scaryrawr.github.io`.

There is no automated test suite. For runtime changes, lint and package first, then verify behavior in a compatible GNOME Shell session.

## Coding Style & Naming Conventions

TypeScript is strict. Oxfmt uses single quotes, no trailing commas, a 120-column width, and LF endings. Keep
variables and functions in `snake_case`, constants in `UPPER_CASE`, and classes in `PascalCase`. Oxlint does
not yet implement the naming-convention rule, so reviewers must enforce these names.

Oxlint enables the supported recommended TypeScript and import safeguards, including nursery
`import/named` and `import/export`. Import resolver settings and `import/no-unresolved` cannot safely resolve
GJS `gi://` and `resource://` specifiers, so they are not enforced; `tsgo` and Rolldown still validate local
module imports. Source imports use `.js` extensions because Rolldown emits ES modules for GJS.

Treat the entrypoints as separate processes: Shell code may import `Clutter`, `Meta`, `Shell`, and `St`, while preferences may import GTK4 and Adwaita. Never cross those library sets.

Module loading and extension construction must create only static JavaScript data. Create GObjects, connect signals, and add main-loop sources in `enable()`; destroy or disconnect all of them in `disable()`, even self-removing sources. Drop references, restore window effects, and cancel or invalidate asynchronous work so it cannot mutate state after disable.

Only list GNOME Shell versions that were tested. Prefer stable GNOME platform APIs and feature detection over version checks or patches of Shell internals.

## Commit & Pull Request Guidelines

Use concise, imperative, sentence-case commit subjects. PRs should explain user-visible GNOME behavior, note supported shell-version changes, and pass `pnpm build:package`. Tags matching `v*` publish the generated ZIP through GitHub Actions.

## Agent Skills

- `gnome-extension-review` — audit lifecycle, compatibility, settings, packaging, and runtime behavior before an EGO submission or after extension-facing changes.
