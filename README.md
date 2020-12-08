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
[
    "Code",
    "Code - Insiders"
]
```

## Ignore List

An ignore list can be created at `~/.config/Focus/ignore_focus.json`.

Windows that match the list criteria will not have their opacity modified even when inactive.

It uses the WM_CLASS (use `xprop` to help figure them out). The below example lets Firefox's Picture-in-Picture keep 100% opacity.

```json
[
    "Toolkit"
]
```

## Installing

Clone into your extensions folder:

`git clone https://github.com/scaryrawr/gnome-focus ~/.local/share/gnome-shell/extensions/focus@scaryrawr.github.io`
