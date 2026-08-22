# TintinTV Android TV APK

This repo includes a small native Android TV WebView shell in `android-tv/`.
It is intended for private side-loading on Android TV devices such as XGIMI
projectors and Amazon Fire TV.

## Authentication

The APK does not store your TintinTV username or password. Instead, it calls
`POST /api/tv-auth` with a private TV token and receives the normal `auth`
cookie used by the web app.

Set the same token in both places:

- Server environment variable: `TV_ACCESS_TOKEN`
- Local Android build file: `android-tv/local.properties`

`android-tv/local.properties` is ignored by git and should stay local because it
contains the APK token and release signing details.

## Build

```bash
pnpm apk:tv
```

The installable APK is copied to:

```text
dist/tintintv-tv.apk
```

## Side-load

For a device with ADB debugging enabled:

```bash
adb connect DEVICE_IP:5555
adb install -r dist/tintintv-tv.apk
```

You can also move `dist/tintintv-tv.apk` to a USB drive or downloader app and
install it manually on the TV device.
