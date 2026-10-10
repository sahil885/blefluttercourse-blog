---
title: "flutter_blue_plus License in 2026: Costs and Free Alternatives"
date: "2026-04-05"
updated: "2026-10-10"
excerpt: "Since version 2.0, flutter_blue_plus needs a paid licence for commercial use. What it costs, who can use it free, the free alternatives, and how to migrate."
tags: ["Comparison", "flutter_blue_plus", "Migration", "Packages"]
faqs:
  - question: "Is flutter_blue_plus free for commercial use?"
    answer: "Not since version 2.0. Its FlutterBluePlus License requires a paid commercial licence for any for-profit organisation, including during development and testing. Personal users, registered nonprofits and accredited educational institutions can use it free. Version 1.36.8, the last 1.x release, is BSD-3-Clause licensed."
  - question: "How much does a flutter_blue_plus commercial licence cost?"
    answer: "It is a one-off fee per organisation, priced by headcount. On 10 October 2026 the FlutterBluePlus licence store listed $999 for an individual, $2,999 for 1 to 9 employees, $5,999 for 10 to 29 employees, and up to $49,999 for 1,000 or more employees."
  - question: "What are the free alternatives to flutter_blue_plus?"
    answer: "universal_ble (BSD-3-Clause) supports Android, iOS, macOS, Windows, Linux and Web. flutter_reactive_ble (BSD-3-Clause) supports Android and iOS. bluetooth_low_energy is MIT licensed and supports Android, iOS, macOS, Windows and Linux. All three allow commercial use with no licence fee."
---

# flutter_blue vs flutter_blue_plus in 2026: The Licence Change and Your Options

Since version 2.0, `flutter_blue_plus` needs a paid licence for commercial use, even while you develop and test. This article covers what the licence costs, who can still use it free, and the free alternatives, so you can pick the right package for your app.

It also covers moving off the original `flutter_blue`. If your project still uses it, you are building on abandoned software: its last release, 0.8.0, shipped in March 2021, and in 2026 it still has unresolved Android 12+ breakage, unfixed iOS bugs, and no active development. `flutter_blue_plus` is its maintained successor.

---

## TL;DR

**flutter_blue_plus is no longer free for commercial apps.** Since version 2.0, any for-profit organisation pays a one-off licence fee, from $999 for an individual to $49,999 for 1,000+ employees, even while it develops and tests. Personal, nonprofit and education projects stay free. For a commercial app you can buy the licence, pin the last BSD-licensed release (1.36.8, which gets no further fixes), or move to a free BSD-licensed package such as universal_ble.

**Still on flutter_blue? Move off it now.** It hasn't had a release since March 2021, doesn't support Android 12+ Bluetooth permissions, and has unresolved bugs that will affect your users. flutter_blue_plus has an almost identical API, active maintenance, and full modern platform support, and the migration typically takes a few hours. Check the licence first.

---

## What Happened to flutter_blue?

flutter_blue was the original, dominant Flutter Bluetooth package for several years. It worked well when Android and iOS Bluetooth APIs were relatively stable. Then Android 12 (API 31) introduced a completely new Bluetooth permission model — `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` replaced the old `BLUETOOTH` and location permissions for scanning.

The flutter_blue maintainers did not update the package to support the new permission model. Apps using flutter_blue on Android 12+ devices began failing silently — scans returning nothing, crashes on characteristic access, permissions errors with no clear path to fix. The package hasn't had a release since 0.8.0 in March 2021.

flutter_blue_plus was forked by the community specifically to address this. It added:

- Full Android 12+ permission support (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`)
- Fixed Android 13 targeting issues  
- Modern iOS CoreBluetooth compatibility
- A more reactive Dart stream-based API
- Ongoing bug fixes and active GitHub maintenance

As of 2026, flutter_blue_plus is the de facto standard for Flutter BLE development. Since version 2.0, though, it comes with a paid licence for commercial use. See our full breakdown of [Flutter BLE package options](/blog/flutter-ble-packages-comparison).

---

## The flutter_blue_plus Licence Changed in Version 2.0

Version 2.0 moved flutter_blue_plus from the BSD-3-Clause licence to its own FlutterBluePlus License. Under that licence:

- **For-profit organisations need a paid commercial licence.** That includes using the package during development, testing or evaluation, not just in released apps.
- **Personal users, registered nonprofits and accredited educational institutions** can use it free.
- **Version 1.36.8**, the last 1.x release, stays under BSD-3-Clause, but it won't get new fixes.
- **Version 2.3.5 added what the changelog calls a "license ping during build"**, which includes your package name and app name.

The commercial licence is a one-off fee per organisation, priced by headcount:

| Licence tier | Listed price (one-off) |
|---|---|
| Individual ("Inventor") | $999 |
| Company, 1–9 employees | $2,999 |
| Company, 10–29 employees | $5,999 |
| Company, 30–99 employees | $9,999 |
| Company, 100–249 employees | $16,999 |
| Company, 250–999 employees | $24,999 |
| Company, 1,000+ employees | $49,999 |

Prices as listed on the [FlutterBluePlus licence store](https://jamcorder.myshopify.com/products/flutterblueplus-commercial-license) on 10 October 2026. Read the [full licence on pub.dev](https://pub.dev/packages/flutter_blue_plus/license) and the [changelog](https://pub.dev/packages/flutter_blue_plus/changelog) before you decide. This isn't legal advice.

### Your options for a commercial app

| Option | Licence cost | Trade-off |
|---|---|---|
| Buy the flutter_blue_plus licence | $999–$49,999 one-off | Keeps the biggest community and the API in this guide |
| Pin flutter_blue_plus 1.36.8 | Free (BSD-3-Clause) | No further fixes or new features |
| Switch to universal_ble | Free (BSD-3-Clause) | Different API; runs on Android, iOS, macOS, Windows, Linux and Web |
| Switch to flutter_reactive_ble | Free (BSD-3-Clause) | Different, stream-based API; Android and iOS only |

If you're starting a new commercial app, the free packages deserve a serious look. Our [Flutter BLE packages comparison](/blog/flutter-ble-packages-comparison) shows how they differ, and our [universal_ble migration guide](/blog/migrate-flutter-blue-plus-to-universal-ble) walks through moving an existing app.

---

## API Comparison: What Actually Changed

The good news: flutter_blue_plus deliberately kept a familiar API to make migration straightforward. The bad news: there are meaningful differences that will require code changes.

### Initialization

**flutter_blue (old):**
```dart
FlutterBlue flutterBlue = FlutterBlue.instance;
```

**flutter_blue_plus (new):**
```dart
// No instance needed — use class-level static methods directly
FlutterBluePlus.startScan(...);
```

### Scanning

**flutter_blue (old):**
```dart
flutterBlue.scan().listen((result) {
  print(result.device.name);
});
```

**flutter_blue_plus (new):**
```dart
FlutterBluePlus.startScan(timeout: const Duration(seconds: 15));
FlutterBluePlus.scanResults.listen((results) {
  for (ScanResult r in results) {
    print(r.device.platformName); // .name is now .platformName
  }
});
```

### Connecting to a Device

**flutter_blue (old):**
```dart
await device.connect();
```

**flutter_blue_plus (new):**
```dart
await device.connect(timeout: const Duration(seconds: 15));
```

### Monitoring Connection State

**flutter_blue (old):**
```dart
device.state.listen((state) {
  if (state == BluetoothDeviceState.connected) { ... }
});
```

**flutter_blue_plus (new):**
```dart
device.connectionState.listen((state) {
  if (state == BluetoothConnectionState.connected) { ... }
});
```

### Adapter State

**flutter_blue (old):**
```dart
FlutterBlue.instance.state.listen((state) {
  if (state == BluetoothState.on) { ... }
});
```

**flutter_blue_plus (new):**
```dart
FlutterBluePlus.adapterState.listen((state) {
  if (state == BluetoothAdapterState.on) { ... }
});
```

### Reading Characteristics

Both packages use the same pattern here — `await characteristic.read()` — so this part of your code will likely need no changes.

### Notifications

**flutter_blue (old):**
```dart
await characteristic.setNotifyValue(true);
characteristic.value.listen((value) { ... });
```

**flutter_blue_plus (new):**
```dart
await characteristic.setNotifyValue(true);
characteristic.lastValueStream.listen((value) { ... });
```

---

## Full API Changes Reference Table

| Concept | flutter_blue | flutter_blue_plus |
|---|---|---|
| Initialization | `FlutterBlue.instance` | Static class methods |
| Start scan | `.scan()` stream | `startScan()` + `scanResults` stream |
| Device name | `device.name` | `device.platformName` |
| Connection state enum | `BluetoothDeviceState` | `BluetoothConnectionState` |
| Adapter state enum | `BluetoothState` | `BluetoothAdapterState` |
| Connection state stream | `device.state` | `device.connectionState` |
| Notification stream | `characteristic.value` | `characteristic.lastValueStream` |
| Adapter state stream | `FlutterBlue.instance.state` | `FlutterBluePlus.adapterState` |
| Android 12+ permissions | ❌ Broken | ✅ Full support |
| Active maintenance | ❌ No release since 2021 | ✅ Active |
| Licence | BSD-3-Clause | Paid for commercial use since 2.0 (1.x is BSD-3-Clause) |

---

## Why Staying on flutter_blue Is Costing You Users

If you haven't migrated yet, here's what your users on modern Android devices are experiencing:

**Android 12 (API 31) and above:** BLE scanning silently fails or throws `SecurityException: Need BLUETOOTH_SCAN permission` because flutter_blue never implemented the new permission model. Depending on your minSdkVersion, this affects a large percentage of your Android user base.

**Android 13 (API 33):** Additional media permission changes cause further instability in apps targeting newer APIs.

**Google Play requirements:** Google requires apps targeting new users to target API 33+. If your app targets API 33+ and uses flutter_blue, you will see BLE failures on a significant portion of Android devices.

iOS is less affected, but flutter_blue_plus still has important iOS fixes that address connection stability issues on newer iOS versions.

---

## Migration Checklist

Before you start, decide whether you'll need the commercial licence (see above). Then work through this list:

- [ ] Replace `flutter_blue` with `flutter_blue_plus` in pubspec.yaml
- [ ] Remove `FlutterBlue.instance` — use static `FlutterBluePlus` methods instead
- [ ] Replace `device.name` with `device.platformName`
- [ ] Replace `BluetoothDeviceState` with `BluetoothConnectionState`
- [ ] Replace `BluetoothState` with `BluetoothAdapterState`
- [ ] Replace `device.state` with `device.connectionState`
- [ ] Replace `characteristic.value` with `characteristic.lastValueStream`
- [ ] Update AndroidManifest.xml with Android 12+ Bluetooth permissions
- [ ] Add runtime permission requests for `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT`
- [ ] Test on a physical Android 12+ device

For the complete permissions setup on both platforms, see our [Flutter BLE Permissions Guide](/blog/flutter-ble-permissions-android-ios).

---

## Alternatives to flutter_blue_plus

If the licence rules flutter_blue_plus out, three maintained packages allow commercial use with no fee:

- **universal_ble** (BSD-3-Clause, published by Navideck) runs on Android, iOS, macOS, Windows, Linux and Web, with APIs for connections, MTU requests, pairing and peripheral mode. Version 2.3.0 shipped in September 2026.
- **flutter_reactive_ble** (BSD-3-Clause, published by Philips Hue) is a mature, stream-based plugin for Android and iOS. Version 5.6.0 shipped in September 2026.
- **bluetooth_low_energy** (MIT) runs on Android, iOS, macOS, Windows and Linux, and supports both the central and peripheral roles.

Two newer BSD-3-Clause packages, **flutter_blue_ultra** and **bluebird**, keep flutter_blue_plus's API shape, so moving to them is mostly a find-and-replace. Both are young, with small user bases.

Moving from flutter_blue to one of these takes more work than moving to flutter_blue_plus, because their APIs differ. For an app you'll sell, that one-off effort can cost less than the licence. For hobby, nonprofit and education projects, flutter_blue_plus remains the easiest move: the biggest community, the most documentation and the most code examples.

---

## After Migration: What to Learn Next

Once you're on flutter_blue_plus, the real learning is in using it effectively — scanning with filters, handling [permissions correctly on Android and iOS](/blog/flutter-ble-permissions-android-ios), [reading and writing GATT characteristics](/blog/flutter-ble-read-write-characteristics), setting up reliable notifications, and managing connection state across your app's lifecycle.

Building a commercial app and would rather skip both the licence and the plumbing? [BLE Starter](https://blestarter.com/?utm_source=blog&utm_medium=referral&utm_campaign=ble_starter&utm_content=flutter-blue-vs-flutter-blue-plus&utm_term=text) is a production-ready Flutter starter kit built on universal_ble, with flutter_reactive_ble as a backup engine: permissions, scanning, auto-reconnect, GATT data, ESP32 OTA updates and tests, already working together. It's in a founding pre-sale.

---

## Frequently Asked Questions

**Is flutter_blue completely broken on Android 12+?**
For apps targeting API 31+, yes — BLE scanning will fail with a SecurityException because the old `BLUETOOTH` and location permissions don't satisfy Android 12's new requirements. Apps targeting API 30 may work on some devices but will fail on others depending on how the OEM implemented the permission checks.

**How long does the flutter_blue to flutter_blue_plus migration take?**
For a typical app with moderate BLE usage, expect two to four hours. The API changes are systematic, not architectural — it's a find-and-replace job in most cases, plus updating the platform permission configuration.

**Does flutter_blue_plus support all the same features as flutter_blue?**
Yes, and more. flutter_blue_plus has broader iOS support, Android 12+ support, MTU negotiation, and active bug fixes that flutter_blue never received.

**Will flutter_blue ever be updated again?**
Don't count on it. Its last release, 0.8.0, came out in March 2021, and it was never updated for Android 12's Bluetooth permission model.

**What version of flutter_blue_plus should I use in 2026?**
The current release is 2.3.14 (October 2026), which needs a commercial licence for for-profit use. If you need a free licence, 1.36.8 is the last BSD-3-Clause release, though it gets no further fixes. Either way, pin a specific version in your pubspec.yaml.

**Is flutter_blue_plus free for commercial use?**
Not since version 2.0. Its FlutterBluePlus License requires a paid commercial licence for any for-profit organisation, including during development and testing. Personal users, registered nonprofits and accredited educational institutions can use it free. Version 1.36.8, the last 1.x release, is BSD-3-Clause licensed.

**How much does a flutter_blue_plus commercial licence cost?**
It is a one-off fee per organisation, priced by headcount. On 10 October 2026 the FlutterBluePlus licence store listed $999 for an individual, $2,999 for 1 to 9 employees, $5,999 for 10 to 29 employees, and up to $49,999 for 1,000 or more employees.

**What are the free alternatives to flutter_blue_plus?**
universal_ble (BSD-3-Clause) supports Android, iOS, macOS, Windows, Linux and Web. flutter_reactive_ble (BSD-3-Clause) supports Android and iOS. bluetooth_low_energy is MIT licensed and supports Android, iOS, macOS, Windows and Linux. All three allow commercial use with no licence fee.
