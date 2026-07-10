# Focus

A quick GNOME extension for apply transparency to inactive windows.

![demo](./assets/demo.gif)

## Settings

Can be found in Gnome Tweaks -> Extensions -> Focus.

### Special Focus List

A special focus list can be created at `~/.config/Focus/special_focus.json`.

Windows that match the list criteria will have an opacity applied to them that can be adjusted in the Extension Preference Window.

It uses the WM_CLASS (use `xprop` to help figure them out).

```json
["Code", "Code - Insiders"]
```

## Ignore List

An ignore list can be created at `~/.config/Focus/ignore_focus.json`.

Windows that match the list criteria will not have their opacity modified even when inactive.

It uses the WM_CLASS (use `xprop` to help figure them out). The below example lets Firefox's Picture-in-Picture keep 100% opacity.

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
