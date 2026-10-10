---
title: "Flutter BLE Packages Comparison 2026: flutter_blue_plus vs Alternatives"
date: "2026-03-25"
updated: "2026-10-10"
excerpt: "flutter_blue_plus vs universal_ble, flutter_reactive_ble, flutter_blue_ultra and bluebird in 2026: licences, platforms, maintenance, and which to use."
tags: ["Flutter", "BLE", "packages", "flutter_blue_plus", "comparison"]
faqs:
  - question: "Is flutter_blue_plus free to use in commercial apps?"
    answer: "Not since version 2.0. It's released under the FlutterBluePlus License, which requires a paid commercial licence for any for-profit organisation, including during development and testing. Personal users, registered nonprofits and accredited educational institutions can use it free, and version 1.36.8, the last 1.x release, is BSD-3-Clause licensed."
  - question: "Which Flutter BLE packages are free for commercial use?"
    answer: "universal_ble, flutter_reactive_ble, flutter_blue_ultra, bluebird and quick_blue are BSD-3-Clause licensed, and bluetooth_low_energy is MIT licensed. All of them allow commercial use with no licence fee. Of these, universal_ble covers the most platforms: Android, iOS, macOS, Windows, Linux and Web."
  - question: "Is there a free drop-in replacement for flutter_blue_plus?"
    answer: "The closest are flutter_blue_ultra and bluebird. Both are BSD-3-Clause licensed and keep flutter_blue_plus's API shape, so switching is mostly a find-and-replace. flutter_blue_ultra describes itself as a community continuation of flutter_blue_plus 1.x, and bluebird began as a rework of flutter_blue_plus. Both are young: in the 30 days to 10 October 2026 each had under 1,000 downloads, against about 259,000 for flutter_blue_plus."
---

> **TL;DR:** **flutter_blue_plus** still has the largest community, but since version 2.0 it needs a paid licence for any for-profit use, even during development. For a commercial app, **universal_ble** (BSD-3-Clause) is the closest free alternative and runs on Android, iOS, macOS, Windows, Linux and Web. **flutter_reactive_ble** (BSD-3-Clause) is a mature, maintained choice for Android and iOS only. If you'd rather keep your flutter_blue_plus code, **flutter_blue_ultra** and **bluebird** are new BSD-3-Clause forks with the same API shape, though both are young. The original flutter_blue and quick_blue haven't had a release in years.

# Flutter BLE Packages Comparison 2026: Which Package Should You Use?

Choosing the right BLE package for your Flutter app is one of the most consequential decisions you'll make. Switch packages mid-project and you're rewriting your entire BLE layer. This guide compares every significant Flutter BLE package so you can make the right choice from day one.

---

## The Flutter BLE Package Landscape in 2026

The Flutter BLE ecosystem has consolidated, and the biggest change in the last year is licensing: version 2.0 of flutter_blue_plus requires a paid licence for commercial use. Here's the current state:

| Package | Licence | Latest stable release | Platforms |
|---------|---------|----------------------|-----------|
| **flutter_blue_plus** | FlutterBluePlus License (paid for commercial use since 2.0) | 2.3.14, Oct 2026 | Android, iOS, macOS, Linux, Web (Windows via a separate package) |
| **universal_ble** | BSD-3-Clause | 2.3.0, Sep 2026 | Android, iOS, macOS, Windows, Linux, Web |
| **flutter_reactive_ble** | BSD-3-Clause | 5.6.0, Sep 2026 | Android, iOS |
| **bluetooth_low_energy** | MIT | 6.2.1, Jan 2026 | Android, iOS, macOS, Windows, Linux |
| **flutter_blue_ultra** | BSD-3-Clause | 2.2.0, Jun 2026 | Android, iOS, macOS, Linux, Web |
| **bluebird** | BSD-3-Clause | 0.6.0, Oct 2026 | Android, iOS, macOS, Web |
| **quick_blue** | BSD-3-Clause | 0.4.1+1, Mar 2022 | Android, iOS, macOS, Windows, Linux |
| **flutter_blue** | BSD-3-Clause | 0.8.0, Mar 2021 | Android, iOS |
| **flutter_ble_lib** | Apache-2.0 | 2.3.2, Feb 2021 | Android, iOS |

Checked on pub.dev on 10 October 2026.

---

## flutter_blue_plus

**flutter_blue_plus** is the maintained successor to the original flutter_blue. It started as a fork to fix critical bugs and has since evolved into a completely rewritten, feature-rich package.

### Licence

Since version 2.0, flutter_blue_plus is released under the FlutterBluePlus License. For-profit organisations need a paid commercial licence, priced by headcount from $999 for an individual to $49,999 for 1,000+ employees, and the licence covers development and testing too. Personal users, registered nonprofits and accredited educational institutions can use it free. Version 1.36.8 is the last BSD-3-Clause release. Our [flutter_blue vs flutter_blue_plus guide](/blog/flutter-blue-vs-flutter-blue-plus) has the full price list and your options.

### Strengths

- **Multi-platform**: Android, iOS, macOS, Linux and Web, with Windows through the separate flutter_blue_plus_winrt package
- **Active development**: Regular releases, responsive maintainers
- **Auto-reconnect**: Built-in connection state management
- **Bond management**: Handles Android bonding/pairing natively
- **MTU negotiation**: Simple API for requesting larger MTU
- **Stream-based API**: Reactive streams for all state changes

### flutter_blue_plus API Example

```dart
// Scanning
FlutterBluePlus.startScan(timeout: const Duration(seconds: 10));
FlutterBluePlus.scanResults.listen((results) {
  for (ScanResult r in results) {
    print('${r.device.platformName}: ${r.rssi} dBm');
  }
});

// Connecting
await device.connect(autoConnect: false);

// Discovering services
List<BluetoothService> services = await device.discoverServices();

// Reading a characteristic
List<int> value = await characteristic.read();

// Writing
await characteristic.write([0x01, 0x02]);

// Notifications
await characteristic.setNotifyValue(true);
characteristic.lastValueStream.listen((value) => handleData(value));
```

### When to use flutter_blue_plus
- Personal, nonprofit and education projects, where it's free
- Commercial apps where the licence fee is worth its larger community and documentation
- Existing codebases already built on it

---

## universal_ble

**universal_ble**, published by Navideck, is a BSD-3-Clause plugin that covers every Flutter platform: Android, iOS, macOS, Windows, Linux and Web.

### Strengths
- Free for commercial use under BSD-3-Clause
- The widest platform list of any package here, including Linux and Web
- Connections, MTU requests, pairing and peripheral (server) mode in one package
- Actively maintained: version 2.3.0 shipped in September 2026

### Weaknesses
- Smaller community than flutter_blue_plus, so fewer examples and Stack Overflow answers
- Some features vary by platform: `autoConnect` works on Android, iOS and macOS but not on Windows, Linux or Web, and MTU requests are best-effort

### When to use universal_ble
- New commercial apps that need a free licence
- Apps that must run on desktop or the web as well as mobile

Moving an existing flutter_blue_plus app? Follow our [step-by-step migration guide to universal_ble](/blog/migrate-flutter-blue-plus-to-universal-ble).

---

## quick_blue

**quick_blue** is a cross-platform BLE plugin that takes a different API approach. It uses a callback-based model rather than streams.

### Strengths
- Relatively simple API
- Good Windows and macOS support
- Lightweight dependency tree

### Weaknesses
- Callback-based (less Dart-idiomatic than streams)
- No stable release since 0.4.1+1 in March 2022
- Smaller community and fewer examples
- Limited error handling primitives

### quick_blue API Example

```dart
// Scanning
QuickBlue.startScan();
QuickBlue.scanResultStream.listen((result) {
  print('Found: ${result.name}');
});

// Connecting
QuickBlue.connect(deviceId);
QuickBlue.connectionEventStream.listen((event) {
  if (event.connectionState == BluetoothConnectionState.connected) {
    QuickBlue.discoverServices(event.deviceId);
  }
});

// Reading
await QuickBlue.readValue(deviceId, serviceId, characteristicId);
```

### When to use quick_blue
- Existing projects already built on it. For new projects, universal_ble covers the same desktop platforms and is still maintained.

quick_blue is BSD-3-Clause licensed.

---

## bluetooth_low_energy

A newer package that aims to provide a clean, type-safe API. It's gaining traction but still maturing.

### Strengths
- Clean, modern API design
- Good type safety
- Supports both the central and peripheral roles
- Runs on Android, iOS, macOS, Windows and Linux
- MIT licensed, so free for commercial use
- Active development: 6.2.1 shipped in January 2026, with a 7.0 pre-release

### Weaknesses
- Smaller community
- Fewer real-world examples and Stack Overflow answers
- API may change as it matures

### When to use bluetooth_low_energy
- New projects where you're willing to be an early adopter
- If you want to evaluate alternatives to flutter_blue_plus

---

## reactive_ble (flutter_reactive_ble)

Published by Philips Hue, **flutter_reactive_ble** is a mature, BSD-3-Clause licensed plugin for Android and iOS. It's still maintained: version 5.6.0 shipped in September 2026.

### Strengths
- Stream-based, reactive API
- Strong reliability focus
- Good connection state management
- Free for commercial use under BSD-3-Clause

### Weaknesses
- Opinionated architecture that suits reactive patterns best
- Android and iOS only, with no desktop or web support

### When to use reactive_ble
- Commercial mobile apps that need a free licence and only target Android and iOS
- Teams comfortable with reactive, stream-based code

---

## The New Forks: flutter_blue_ultra and bluebird

Since the licence change, two BSD-3-Clause packages have appeared that keep flutter_blue_plus's API shape, so switching to them is mostly a find-and-replace rather than a rewrite. Both are young: in the 30 days to 10 October 2026, flutter_blue_ultra had 561 downloads and bluebird 794, against about 259,000 for flutter_blue_plus.

### flutter_blue_ultra

**flutter_blue_ultra**, published by Intent, describes itself as "a community continuation of flutter_blue_plus 1.x."
- BSD-3-Clause, on Android, iOS, macOS, Linux and Web (central role only)
- Latest release: 2.2.0, June 2026
- To switch, replace `flutter_blue_plus` with `flutter_blue_ultra` in your imports and `FlutterBluePlus` with `FlutterBlueUltra` in your code. A compatibility layer also keeps the old `FlutterBluePlus` name working while you migrate file by file.
- You can't install it alongside flutter_blue_plus.

### bluebird

**bluebird**, by Nebojša Cvetković, began as a rework of flutter_blue_plus, and most of its `BluetoothDevice`, `BluetoothService` and `BluetoothCharacteristic` API works the same way.
- BSD-3-Clause, on Android, iOS, macOS and Web
- Pre-1.0: the latest release is 0.6.0, from October 2026
- Needs Flutter 3.44 or newer
- Comes with a [migration guide from flutter_blue_plus](https://github.com/nebkat/flutter-bluebird/blob/main/MIGRATION.md). The main change is that you get characteristics by discovering services, not by constructing them yourself.

### When to use a fork
- You have a working flutter_blue_plus app and want to avoid the licence with the fewest code changes
- You're comfortable depending on a young project with a small user base, and you'll check its activity before you commit

For a new app, universal_ble and flutter_reactive_ble have far larger user bases.

---

## Packages to Avoid

### flutter_blue (Original)
The original package is **unmaintained**: its last release, 0.8.0, shipped in March 2021. Do not use it in new projects. It:
- Has unresolved Android/iOS bugs
- Doesn't support newer Android BLE APIs
- No desktop support
- No active maintenance

If you're on flutter_blue, see our full [flutter_blue vs flutter_blue_plus migration guide](/blog/flutter-blue-vs-flutter-blue-plus).

### flutter_ble_lib
No release since 2.3.2 in February 2021, and pub.dev marks it incompatible with Dart 3. Do not use it.

---

## Head-to-Head Comparison

| | flutter_blue_plus | universal_ble | flutter_reactive_ble | bluetooth_low_energy |
|---------|:-----------------:|:-------------:|:--------------------:|:--------------------:|
| Free for commercial use | ❌ Paid licence since 2.0 | ✅ BSD-3-Clause | ✅ BSD-3-Clause | ✅ MIT |
| Android | ✅ | ✅ | ✅ | ✅ |
| iOS | ✅ | ✅ | ✅ | ✅ |
| macOS | ✅ | ✅ | ❌ | ✅ |
| Windows | Separate package | ✅ | ❌ | ✅ |
| Linux | ✅ | ✅ | ❌ | ✅ |
| Web | ✅ | ✅ | ❌ | ❌ |
| Peripheral (server) role | ❌ | ✅ | ❌ | ✅ |
| Latest stable release | Oct 2026 | Sep 2026 | Sep 2026 | Jan 2026 |
| Community size | Large | Small | Medium | Small |

Platform support from each package's pub.dev listing and README, checked on 10 October 2026.

---

## Performance Comparison

BLE performance in Flutter is largely determined by the native platform APIs, not the Dart layer. However, the package matters for:

### Throughput
All packages top out at similar throughput (determined by BLE radio + MTU). flutter_blue_plus provides MTU negotiation out of the box, which is critical for maximizing throughput.

### Latency
flutter_blue_plus uses Android's BluetoothGattCallback directly with minimal overhead. On iOS, it wraps CoreBluetooth efficiently.

### Stability
flutter_blue_plus has the most reported stability improvements over the deprecated flutter_blue, particularly for:
- Android 12+ permission model
- Connection state handling on iOS
- Background operation

---

## Adding flutter_blue_plus to Your Project

```yaml
# pubspec.yaml
dependencies:
  flutter_blue_plus: ^1.31.0
```

`^1.31.0` stays on the 1.x line, which ends at 1.36.8: BSD-3-Clause licensed, but with no further fixes. Version 2.x needs a commercial licence for for-profit use. If you choose universal_ble instead, add `universal_ble` to pubspec.yaml; the Android and iOS permission setup below applies to any BLE package.

For the complete setup including permissions, see our [Flutter BLE permissions guide for Android & iOS](/blog/flutter-ble-permissions-android-ios).

### Android Setup

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### iOS Setup

```xml
<!-- ios/Runner/Info.plist -->
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to communicate with BLE devices</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app uses Bluetooth to communicate with BLE devices</string>
```

---

## Should Flutter or Native Handle Your BLE?

If you're debating whether to use Flutter for BLE at all vs. going native, see our comparison articles:
- [Flutter BLE vs Native Android (Kotlin)](/blog/flutter-ble-vs-native-android-kotlin) — when Flutter wins, when Kotlin wins
- [Flutter vs React Native for BLE Development](/blog/flutter-vs-react-native-ble) — cross-platform framework comparison

---

## Related Guides

Build on this foundation with the rest of the blog:

- 🚀 **[Getting Started with BLE in Flutter](/blog/getting-started-ble-flutter)** — BLE fundamentals for Flutter devs
- 🔬 **[BLE GATT Profiles Explained](/blog/ble-gatt-profiles-explained)** — Understand services & characteristics
- 📡 **[Flutter BLE Scanning & Device Discovery](/blog/flutter-ble-scanning-guide)** — Scanning best practices
- 📖 **[Reading & Writing BLE Characteristics](/blog/flutter-ble-read-write-characteristics)** — Data operations
- 🔒 **[Flutter BLE Permissions Guide](/blog/flutter-ble-permissions-android-ios)** — Android & iOS permissions
- 🏗️ **[Build a Complete Flutter BLE App](/blog/build-complete-flutter-ble-app)** — End-to-end project
- 🔄 **[flutter_blue vs flutter_blue_plus](/blog/flutter-blue-vs-flutter-blue-plus)** — Migration guide
- 🧭 **[Migrate from flutter_blue_plus to universal_ble](/blog/migrate-flutter-blue-plus-to-universal-ble)** — Step-by-step code migration
- ⚡ **[BLE vs Classic Bluetooth in Flutter](/blog/ble-vs-classic-bluetooth-flutter)** — Protocol comparison
- 🤖 **[ESP32 vs Arduino for Flutter BLE](/blog/esp32-vs-arduino-flutter-ble)** — Hardware choice
- ⚖️ **[Flutter vs React Native for BLE](/blog/flutter-vs-react-native-ble)** — Framework choice
- 🤖 **[Flutter BLE vs Native Android](/blog/flutter-ble-vs-native-android-kotlin)** — vs Kotlin
- 🌐 **[BLE vs WiFi for Flutter IoT](/blog/ble-vs-wifi-flutter-iot)** — Connectivity choice

---

## Frequently Asked Questions

### Is flutter_blue_plus free to use in commercial apps?
Not since version 2.0. It's released under the FlutterBluePlus License, which requires a paid commercial licence for any for-profit organisation, including during development and testing. Personal users, registered nonprofits and accredited educational institutions can use it free, and version 1.36.8, the last 1.x release, is BSD-3-Clause licensed.

### Which Flutter BLE packages are free for commercial use?
universal_ble, flutter_reactive_ble, flutter_blue_ultra, bluebird and quick_blue are BSD-3-Clause licensed, and bluetooth_low_energy is MIT licensed. All of them allow commercial use with no licence fee. Of these, universal_ble covers the most platforms: Android, iOS, macOS, Windows, Linux and Web.

### Is there a free drop-in replacement for flutter_blue_plus?
The closest are flutter_blue_ultra and bluebird. Both are BSD-3-Clause licensed and keep flutter_blue_plus's API shape, so switching is mostly a find-and-replace. flutter_blue_ultra describes itself as a community continuation of flutter_blue_plus 1.x, and bluebird began as a rework of flutter_blue_plus. Both are young: in the 30 days to 10 October 2026 each had under 1,000 downloads, against about 259,000 for flutter_blue_plus.

### Can I use flutter_blue_plus for both Android and iOS in the same codebase?
Absolutely. That's one of its biggest advantages. The same Dart API works on both platforms with platform-specific configurations handled internally.

### How do I migrate from flutter_blue to flutter_blue_plus?
The APIs are similar but not identical. Key changes: the package is `FlutterBluePlus` instead of `FlutterBlue`, scanning API has changed slightly, and device connection methods have been updated. See our [full migration guide](/blog/flutter-blue-vs-flutter-blue-plus).

### Does flutter_blue_plus support BLE peripherals (acting as a server)?
As of 2026, flutter_blue_plus focuses on the central role (client). For peripheral mode, you'd need a different package or native code. Most Flutter BLE apps are clients connecting to IoT hardware.

### What's the minimum Android version supported by flutter_blue_plus?
flutter_blue_plus supports Android 5.0 (API 21) and above. However, Android 12+ requires updated Bluetooth permissions (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`).

### How does flutter_blue_plus compare in terms of bundle size?
The package adds minimal overhead to your app size. The BLE stack is part of the OS — the package is just a thin Dart+native bridge.

---

## Make the Right Choice from Day One

For personal, nonprofit and education projects, flutter_blue_plus is still the easiest choice: the largest community and the most examples. For a commercial app, weigh its licence fee against the cost of using a free package. universal_ble is the closest free alternative and runs on every Flutter platform, and flutter_reactive_ble is a solid free option if you only need Android and iOS. If you want to keep your flutter_blue_plus code, flutter_blue_ultra and bluebird are the quickest switch, as long as you're comfortable with young projects.

If you'd rather not build the production layer yourself, [BLE Starter](https://blestarter.com/?utm_source=blog&utm_medium=referral&utm_campaign=ble_starter&utm_content=flutter-ble-packages-comparison&utm_term=text) is a Flutter starter kit built on universal_ble, with flutter_reactive_ble as a backup engine: permissions, scanning, auto-reconnect, GATT data, ESP32 OTA updates and tests, already working together. It's in a founding pre-sale.
