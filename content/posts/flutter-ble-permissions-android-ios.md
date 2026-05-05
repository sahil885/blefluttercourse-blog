---
title: "Flutter BLE Permissions Guide: Android & iOS Setup for flutter_blue_plus"
date: "2026-04-05"
description: "Complete guide to Bluetooth permissions for Flutter BLE apps. Covers Android 12+ BLUETOOTH_SCAN/CONNECT, iOS Info.plist, runtime permission requests, and common errors."
tags: ["Flutter", "BLE", "permissions", "Android", "iOS", "flutter_blue_plus"]
---

> **TL;DR:** Android 12+ requires `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, and optionally `ACCESS_FINE_LOCATION` in your manifest, plus runtime requests via `permission_handler`. iOS requires `NSBluetoothAlwaysUsageDescription` in Info.plist. Always check adapter state before scanning. Missing permissions cause silent failures — not crash logs.

# Flutter BLE Permissions Guide: Android & iOS Setup for flutter_blue_plus

Permissions are where most Flutter BLE projects get stuck. A missing declaration causes a silent scan failure with no error. A wrong API level target breaks Android 12. An iOS app gets rejected from the App Store for a vague plist entry. This guide gives you the exact setup for both platforms so you never hit those issues.

---

## Why BLE Permissions Are Complex

BLE permissions changed significantly across OS versions:

| Platform | Version | Change |
|----------|---------|--------|
| Android | < 12 | Required `ACCESS_FINE_LOCATION` for scanning |
| Android | 12+ | New `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` permissions |
| Android | 13+ | `neverForLocation` flag available if not using GPS |
| iOS | < 13 | `NSBluetoothPeripheralUsageDescription` |
| iOS | 13+ | `NSBluetoothAlwaysUsageDescription` required |

---

## Android Setup

### 1. AndroidManifest.xml

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

  <!-- Android 12+ permissions -->
  <uses-permission android:name="android.permission.BLUETOOTH_SCAN"
      android:usesPermissionFlags="neverForLocation" />
  <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

  <!-- Android < 12 (still needed for older devices) -->
  <uses-permission android:name="android.permission.BLUETOOTH"
      android:maxSdkVersion="30" />
  <uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
      android:maxSdkVersion="30" />

  <!-- Location — required on Android < 12, optional on 12+ -->
  <!-- Remove neverForLocation flag above if you DO use location -->
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

  <!-- Declare BLE feature (marks app as requiring BLE) -->
  <uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />

  <application ...>
    ...
  </application>
</manifest>
```

> **`neverForLocation` flag**: Add this to `BLUETOOTH_SCAN` if your app does NOT use BLE scanning to derive the user's location. This exempts you from requiring location permission on Android 12+. If you remove it, you must also declare and request `ACCESS_FINE_LOCATION`.

### 2. Minimum SDK Version

```gradle
// android/app/build.gradle
android {
  defaultConfig {
    minSdkVersion 21  // Minimum for BLE support
    targetSdkVersion 34
  }
}
```

### 3. Runtime Permission Requests (Android 12+)

Add `permission_handler` to your pubspec:

```yaml
dependencies:
  permission_handler: ^11.3.0
```

```dart
import 'package:permission_handler/permission_handler.dart';

Future<bool> requestBluetoothPermissions() async {
  if (!Platform.isAndroid) return true;

  // Check Android SDK version
  final sdkInt = await _getAndroidSdkVersion();

  List<Permission> permissions;
  if (sdkInt >= 31) {
    // Android 12+
    permissions = [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
    ];
  } else {
    // Android < 12
    permissions = [
      Permission.bluetooth,
      Permission.locationWhenInUse,
    ];
  }

  final statuses = await permissions.request();
  return statuses.values.every((s) => s.isGranted);
}

Future<int> _getAndroidSdkVersion() async {
  if (!Platform.isAndroid) return 0;
  final info = await DeviceInfoPlugin().androidInfo;
  return info.version.sdkInt;
}
```

### 4. Check Bluetooth Adapter State

Always verify Bluetooth is enabled before scanning:

```dart
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

Future<bool> isBluetoothReady() async {
  final state = await FlutterBluePlus.adapterState.first;
  return state == BluetoothAdapterState.on;
}

// Listen for state changes (user toggles Bluetooth)
FlutterBluePlus.adapterState.listen((state) {
  if (state == BluetoothAdapterState.on) {
    print('Bluetooth is on — ready to scan');
  } else {
    print('Bluetooth is off: $state');
  }
});
```

---

## iOS Setup

### 1. Info.plist

```xml
<!-- ios/Runner/Info.plist -->
<dict>
  <!-- Required for iOS 13+ — describes WHY you need Bluetooth -->
  <key>NSBluetoothAlwaysUsageDescription</key>
  <string>This app uses Bluetooth to connect to and communicate with BLE devices.</string>

  <!-- Required for iOS < 13 -->
  <key>NSBluetoothPeripheralUsageDescription</key>
  <string>This app uses Bluetooth to connect to BLE devices.</string>

  <!-- Required if your app uses BLE in the background -->
  <key>UIBackgroundModes</key>
  <array>
    <string>bluetooth-central</string>
    <!-- Add bluetooth-peripheral if acting as a peripheral -->
  </array>
</dict>
```

> **App Store rejection warning**: Vague usage descriptions like "App uses Bluetooth" can get your app rejected. Be specific: explain what device you connect to and what data you exchange.

### 2. iOS Permission Flow

iOS shows the Bluetooth permission dialog automatically when you first call `FlutterBluePlus.startScan()` or `FlutterBluePlus.adapterState`. You don't need `permission_handler` for iOS Bluetooth specifically — the system handles it.

```dart
// On iOS, just check adapter state — system will prompt for permission
FlutterBluePlus.adapterState.listen((state) {
  switch (state) {
    case BluetoothAdapterState.on:
      // Good to go
      break;
    case BluetoothAdapterState.unauthorized:
      // User denied permission — guide them to Settings
      showPermissionDeniedDialog();
      break;
    case BluetoothAdapterState.off:
      // Bluetooth disabled
      break;
    default:
      break;
  }
});
```

### 3. Handling Permission Denied on iOS

If the user denies Bluetooth permission, you can't re-request it — you must direct them to Settings:

```dart
void showPermissionDeniedDialog() {
  showDialog(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Bluetooth Permission Required'),
      content: const Text(
        'Please enable Bluetooth access in Settings > Privacy > Bluetooth to use this app.'
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () => openAppSettings(), // from permission_handler
          child: const Text('Open Settings'),
        ),
      ],
    ),
  );
}
```

---

## Cross-Platform Permission Check

A unified helper that handles both platforms:

```dart
class BlePermissionManager {
  static Future<BlePermissionResult> checkAndRequest() async {
    // 1. Check if BLE is supported
    if (!await FlutterBluePlus.isSupported) {
      return BlePermissionResult.notSupported;
    }

    // 2. Request runtime permissions on Android
    if (Platform.isAndroid) {
      final granted = await _requestAndroidPermissions();
      if (!granted) return BlePermissionResult.denied;
    }

    // 3. Check adapter state
    final state = await FlutterBluePlus.adapterState.first;
    if (state == BluetoothAdapterState.unauthorized) {
      return BlePermissionResult.denied;
    }
    if (state != BluetoothAdapterState.on) {
      return BlePermissionResult.bluetoothOff;
    }

    return BlePermissionResult.ready;
  }

  static Future<bool> _requestAndroidPermissions() async {
    final info = await DeviceInfoPlugin().androidInfo;
    final sdk = info.version.sdkInt;

    final permissions = sdk >= 31
      ? [Permission.bluetoothScan, Permission.bluetoothConnect]
      : [Permission.bluetooth, Permission.locationWhenInUse];

    final statuses = await permissions.request();
    return statuses.values.every((s) => s.isGranted);
  }
}

enum BlePermissionResult { ready, denied, bluetoothOff, notSupported }

// Usage before scanning
final result = await BlePermissionManager.checkAndRequest();
switch (result) {
  case BlePermissionResult.ready:
    await startScan();
    break;
  case BlePermissionResult.denied:
    showPermissionDeniedUI();
    break;
  case BlePermissionResult.bluetoothOff:
    showEnableBluetoothUI();
    break;
  case BlePermissionResult.notSupported:
    showNotSupportedUI();
    break;
}
```

---

## Common Permission Errors and Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Scan returns no results (no error) | Missing `BLUETOOTH_SCAN` permission | Add to manifest + request at runtime |
| `SecurityException` on connect | Missing `BLUETOOTH_CONNECT` | Add to manifest + request at runtime |
| iOS: no permission dialog appears | Missing plist entry | Add `NSBluetoothAlwaysUsageDescription` |
| iOS: `state = unauthorized` immediately | App has no plist description | Add plist entry and reinstall |
| Android: works on API 30, fails on API 31 | Old permissions only | Add new Android 12 permissions |
| Location permission required | `neverForLocation` flag missing | Add flag to `BLUETOOTH_SCAN` |

---

## Background BLE on iOS

For apps that must receive BLE data when backgrounded (e.g., health monitors):

```xml
<!-- Info.plist: declare background mode -->
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
</array>
```

```dart
// iOS background scanning: MUST filter by service UUID
await FlutterBluePlus.startScan(
  withServices: [Guid(YOUR_SERVICE_UUID)], // Required for iOS background
  androidScanMode: AndroidScanMode.lowPower,
);
```

Apple reviews background Bluetooth usage carefully — your app description must justify it clearly.

---

## Related Guides

- 🚀 **[Getting Started with BLE in Flutter](/posts/getting-started-ble-flutter)** — BLE fundamentals
- 🔬 **[BLE GATT Profiles Explained](/posts/ble-gatt-profiles-explained)** — Services & characteristics
- 📡 **[Flutter BLE Scanning Guide](/posts/flutter-ble-scanning-guide)** — Using permissions to scan
- 📖 **[Reading & Writing BLE Characteristics](/posts/flutter-ble-read-write-characteristics)** — Data operations
- 🏗️ **[Build a Complete Flutter BLE App](/posts/build-complete-flutter-ble-app)** — Full app with permissions
- 📦 **[Flutter BLE Packages Comparison](/posts/flutter-ble-packages-comparison)** — Package choices
- 🔄 **[flutter_blue vs flutter_blue_plus](/posts/flutter-blue-vs-flutter-blue-plus)** — Package migration
- ⚡ **[BLE vs Classic Bluetooth in Flutter](/posts/ble-vs-classic-bluetooth-flutter)** — Protocol comparison
- 🤖 **[ESP32 vs Arduino for Flutter BLE](/posts/esp32-vs-arduino-flutter-ble)** — Hardware pairing
- ⚖️ **[Flutter vs React Native for BLE](/posts/flutter-vs-react-native-ble)** — Framework comparison
- 📱 **[Flutter BLE vs Native Android (Kotlin)](/posts/flutter-ble-vs-native-android-kotlin)** — vs native
- 🌐 **[BLE vs WiFi for Flutter IoT](/posts/ble-vs-wifi-flutter-iot)** — Connectivity comparison

---

## Frequently Asked Questions

### Do I need location permission for BLE scanning on Android 12+?
Not if you add the `android:usesPermissionFlags="neverForLocation"` flag to `BLUETOOTH_SCAN`. This tells Android your app doesn't use scanning to derive location. If you remove this flag, you'll need `ACCESS_FINE_LOCATION` at runtime.

### Why does my BLE scan silently return nothing on Android?
Almost always a missing permission. Unlike crashes, permission violations in BLE often fail silently. Double check: (1) `BLUETOOTH_SCAN` in manifest, (2) runtime permission granted, (3) Bluetooth adapter is on, (4) `FlutterBluePlus.adapterState` returns `on`.

### Does flutter_blue_plus handle iOS Bluetooth permission dialogs automatically?
Yes. The iOS system dialog fires automatically on first Bluetooth use. You just need the correct plist entries. Use `FlutterBluePlus.adapterState` to detect the `unauthorized` state if the user denies.

### Can I use `permission_handler` for iOS Bluetooth permissions?
`permission_handler` has limited support for iOS Bluetooth — it can check status but can't re-request after denial (iOS restriction). For iOS, rely on `FlutterBluePlus.adapterState` to detect authorization state and direct denied users to Settings.

### What happens if I forget to declare Bluetooth permissions in Info.plist?
Your app will crash on iOS the first time it tries to use Bluetooth with a message like "This app has crashed because it attempted to access privacy-sensitive data without a usage description." Always add the plist entries before testing on a real device.

### Is there a shortcut to get all BLE permissions right the first time?
The **[BLE Flutter Course](https://blefluttercourse.com/)** includes a project starter template with all permissions pre-configured for Android and iOS, so you never have to debug missing permission issues from scratch.

---

## Get Permissions Right Once, Build Forever

Bluetooth permissions are a one-time setup that unlocks every other BLE feature. With the manifest entries, plist keys, and runtime request code above, you'll never hit a permission-related scan failure again.

**Next step:** Start [scanning for BLE devices](/posts/flutter-ble-scanning-guide) or jump straight to the [complete app build guide](/posts/build-complete-flutter-ble-app).

Or learn everything end-to-end in the **[BLE Flutter Course](https://blefluttercourse.com/)** — structured, hardware-driven BLE development from setup to shipping.

👉 **[Enroll in the BLE Flutter Course →](https://blefluttercourse.com/)**
