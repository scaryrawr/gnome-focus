# Focus

A quick GNOME extension for apply transparency to inactive windows.

![demo](./assets/demo.gif)

## Settings

Open Focus from the GNOME Extensions app to configure opacity, inactive-window effects, special focus windows,
and exclusions.

### Special Focus Windows

Use the **Special Focus Windows** preferences page to add or remove windows that should use the special focused
opacity while active.

### Excluded Windows

Use the **Excluded Windows** preferences page to add or remove exact criteria. A window is excluded when a criterion exactly matches any of:

- its `WM_CLASS`
- its `WM_CLASS` instance
- its full window title

Both lists use exact, case-sensitive matches against a window's `WM_CLASS`, `WM_CLASS` instance, or full title. On
X11, `xprop WM_CLASS` can show the class and instance; GNOME Shell's Looking Glass can help inspect windows on
Wayland. Blank entries are not stored, duplicate entries are removed, and changes apply immediately while the
extension is enabled.

## Legacy JSON Lists

Existing JSON lists remain supported and are merged with the corresponding preferences. Focus reads them from
`~/.config/focus@scaryrawr.github.io/`, falling back to the legacy `~/.config/Focus/` directory when the preferred
directory is absent. Each file must contain a JSON array of strings; invalid files are ignored with a warning in
the GNOME Shell log.

`special_focus.json` adds special focus windows:

```json
["Code", "Code - Insiders"]
```

`ignore_focus.json` adds excluded windows. This example lets Firefox's Picture-in-Picture keep its normal
appearance:

```json
["Toolkit"]
```

## Installing

[GNOME Extensions - Focus](https://extensions.gnome.org/extension/3924/focus/)

## Repo Guide

The build uses [GJS type definitions](https://gjsify.org/), Rolldown, Oxlint, native TypeScript, and Oxfmt.
Building works on non-Linux systems, but local extension installation requires Linux and GNOME Shell.

### Prerequisites

Use Node.js 22 and the pnpm 11 version pinned in `package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
```

### Quality checks

```bash
pnpm lint
```

### Build

```bash
pnpm build
```

### Packaging for [GNOME Extensions](https://extensions.gnome.org/)

```bash
pnpm build:package
```

### Installing Locally

```bash
pnpm package:install
```
