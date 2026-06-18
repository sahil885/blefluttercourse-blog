---
title: "flutter_blue vs flutter_blue_plus: Complete Migration Guide (2026)"
date: "2026-04-05"
excerpt: "flutter_blue is deprecated and unmaintained. flutter_blue_plus is the active successor with Android 12+ support, a modern API, and ongoing maintenance. Here's exactly what changed, why it matters, and what to expect from the migration."
tags: ["Comparison", "flutter_blue_plus", "Migration", "Packages"]
---

# flutter_blue vs flutter_blue_plus: Why You Need to Migrate in 2026

If your Flutter project is still using `flutter_blue`, you are building on abandoned software. The original flutter_blue package was officially deprecated, and in 2026 it sits unmaintained with unresolved Android 12+ breakage, unfixed iOS bugs, and zero active development.

`flutter_blue_plus` is the community-maintained successor. This article explains exactly what changed, what the migration involves, and why staying on the old package is costing you time on every Android device running API 31 or higher.

---

> **Free guide:** Struggling with dropped connections? Grab *The 7 BLE Mistakes That Make Flutter Apps Disconnect* — production-ready fixes you can apply today. [**Download the free guide →**](https://blog.blefluttercourse.com/free-guide)

## TL;DR

**Migrate to flutter_blue_plus immediately.** The original flutter_blue is deprecated, does not support Android 12+ Bluetooth permissions, and has unresolved bugs that will affect your users. flutter_blue_plus has an almost identical API, active maintenance, and full modern platform support. The migration typically takes under two hours.

---

## What Happened to flutter_blue?

flutter_blue was the original, dominant Flutter Bluetooth package for several years. It worked well when Android and iOS Bluetooth APIs were relatively stable. Then Android 12 (API 31) introduced a completely new Bluetooth permission model — `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` replaced the old `BLUETOOTH` and location permissions for scanning.

The flutter_blue maintainers did not update the package to support the new permission model. Apps using flutter_blue on Android 12+ devices began failing silently — scans returning nothing, crashes on characteristic access, permissions errors with no clear path to fix. The package was eventually marked deprecated.

flutter_blue_plus was forked by the community specifically to address this. It added:

- Full Android 12+ permission support (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`)
- Fixed Android 13 targeting issues  
- Modern iOS CoreBluetooth compatibility
- A more reactive Dart stream-based API
- Ongoing bug fixes and active GitHub maintenance

As of 2026, flutter_blue_plus is the de facto standard for Flutter BLE development. See our full breakdown of [Flutter BLE package options](/blog/flutter-ble-packages-comparison).

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
| Active maintenance | ❌ Deprecated | ✅ Active |

---

## Why Staying on flutter_blue Is Costing You Users

If you haven't migrated yet, here's what your users on modern Android devices are experiencing:

**Android 12 (API 31) and above:** BLE scanning silently fails or throws `SecurityException: Need BLUETOOTH_SCAN permission` because flutter_blue never implemented the new permission model. Depending on your minSdkVersion, this affects a large percentage of your Android user base.

**Android 13 (API 33):** Additional media permission changes cause further instability in apps targeting newer APIs.

**Google Play requirements:** Google requires apps targeting new users to target API 33+. If your app targets API 33+ and uses flutter_blue, you will see BLE failures on a significant portion of Android devices.

iOS is less affected, but flutter_blue_plus still has important iOS fixes that address connection stability issues on newer iOS versions.

---

## Migration Checklist

Use this when migrating your project:

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

## flutter_blue_plus vs bluetooth_low_energy: Is There a Newer Alternative?

Yes — `bluetooth_low_energy` is a newer package that has gained attention in 2025-2026 for its cleaner API design. However, flutter_blue_plus remains the more battle-tested choice for production apps in 2026: larger community, more documentation, more GitHub issues resolved, and more code examples available.

For most teams migrating from flutter_blue, going to flutter_blue_plus is the right move. The bluetooth_low_energy package is worth evaluating for greenfield projects where you have time to work through its smaller community knowledge base.

---

## After Migration: What to Learn Next

Once you're on flutter_blue_plus, the real learning is in using it effectively — scanning with filters, handling [permissions correctly on Android and iOS](/blog/flutter-ble-permissions-android-ios), [reading and writing GATT characteristics](/blog/flutter-ble-read-write-characteristics), setting up reliable notifications, and managing connection state across your app's lifecycle.

The [BLE Flutter Course](https://blefluttercourse.com) covers all of this systematically, using flutter_blue_plus as its foundation. It's designed for Flutter developers who've already learned the basics and want to ship production-quality BLE apps — the kind with robust reconnection logic, background support, and real hardware compatibility.

---

## Frequently Asked Questions

**Is flutter_blue completely broken on Android 12+?**
For apps targeting API 31+, yes — BLE scanning will fail with a SecurityException because the old `BLUETOOTH` and location permissions don't satisfy Android 12's new requirements. Apps targeting API 30 may work on some devices but will fail on others depending on how the OEM implemented the permission checks.

**How long does the flutter_blue to flutter_blue_plus migration take?**
For a typical app with moderate BLE usage, expect two to four hours. The API changes are systematic, not architectural — it's a find-and-replace job in most cases, plus updating the platform permission configuration.

**Does flutter_blue_plus support all the same features as flutter_blue?**
Yes, and more. flutter_blue_plus has broader iOS support, Android 12+ support, MTU negotiation, and active bug fixes that flutter_blue never received.

**Will flutter_blue ever be updated again?**
No. The package is officially deprecated and the maintainers have directed users to flutter_blue_plus. No updates are expected.

**What version of flutter_blue_plus should I use in 2026?**
Check pub.dev for the latest stable release of flutter_blue_plus. As of early 2026, the 1.x series is stable and production-ready. Always pin to a specific version in your pubspec.yaml.
