---
title: "Flutter BLE Permissions: Android & iOS Complete Setup Guide (2026)"
date: "2025-05-20"
excerpt: "Fix Flutter BLE permission issues on Android and iOS. Complete 2026 guide covering Android 12+ BLUETOOTH_SCAN, iOS NSBluetoothAlwaysUsageDescription, and runtime permission handling with permission_handler."
tags: ["Permissions", "Android", "iOS", "Troubleshooting"]
---

# Flutter BLE Permissions: Android & iOS Complete Setup Guide (2026)

"Flutter BLE not working" is the most common complaint from Flutter developers — and in 90% of cases, the root cause is misconfigured permissions. BLE permissions in Flutter are tricky because the requirements changed significantly in Android 12, and iOS has its own strict rules.

This guide covers every permission you need for BLE scanning and connecting on both platforms in 2026, with copy-paste solutions for the most common errors including "flutter ble not working", "flutter bluetooth connection failed", and "flutter ble ios not connecting".

## Why BLE Permissions Are Complicated

On **Android**, BLE permissions changed dramatically with Android 12 (API 31). Before Android 12, scanning required location permissions because BLE scanning could theoretically be used to infer your physical location. From Android 12 onward there are dedicated Bluetooth permissions — but you still need to support older API levels in most apps.

On **iOS**, permissions are simpler but strictly enforced. Apple will reject your app from the App Store if your usage descriptions are missing or vague.

## Android Permissions: Complete Setup

### AndroidManifest.xml

Add ALL of these to `android/app/src/main/AndroidManifest.xml` inside the `<manifest>` tag:

```xml
<!-- Android 12+ (API 31+): New dedicated Bluetooth permissions -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />

<!-- Android 11 and below: Legacy permissions -->
<uses-permission android:name="android.permission.BLUETOOTH"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
    android:maxSdkVersion="30" />

<!-- Location required for BLE scanning on Android 10 and below -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"
    android:maxSdkVersion="30" />
```

> **Note:** The `neverForLocation` flag on `BLUETOOTH_SCAN` tells Android you're not using scan results to derive location. Remove it only if your app genuinely uses BLE for location purposes.

### build.gradle

Make sure your SDK versions are correct in `android/app/build.gradle`:

```groovy
android {
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 34
    }
}
```

## iOS Permissions: Complete Setup

### Info.plist

Add to `ios/Runner/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to connect to BLE devices and read sensor data.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app uses Bluetooth to connect to BLE devices and read sensor data.</string>
```

Write a **real, specific description** — Apple's review team reads these. "App uses Bluetooth" will get flagged. Be clear about what you connect to and why.

### Background BLE on iOS

If your app needs to maintain BLE connections in the background, add:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>bluetooth-central</string>
</array>
```

Without this, iOS disconnects your BLE session about 10 seconds after the app backgrounds.

## Runtime Permission Handling

Declaring permissions in manifests isn't enough — on Android 6+ you must also request them at runtime. Add `permission_handler`:

```yaml
dependencies:
  flutter_blue_plus: ^1.32.0
  permission_handler: ^11.3.0
```

### Complete Permission Request

```dart
import 'dart:io';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

Future<bool> requestBlePermissions() async {
  if (Platform.isAndroid) {
    return _requestAndroid();
  } else if (Platform.isIOS) {
    return _checkIos();
  }
  return false;
}

Future<bool> _requestAndroid() async {
  // Check Android version
  final info = await DeviceInfoPlugin().androidInfo;
  final sdk = info.version.sdkInt;

  if (sdk >= 31) {
    // Android 12+
    final statuses = await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
    ].request();
    return statuses.values.every((s) => s == PermissionStatus.granted);
  } else {
    // Android 11 and below
    final statuses = await [
      Permission.bluetooth,
      Permission.locationWhenInUse,
    ].request();
    return statuses.values.every((s) => s == PermissionStatus.granted);
  }
}

Future<bool> _checkIos() async {
  // iOS requests Bluetooth permission automatically on first use.
  // Just verify the adapter is on.
  final state = await FlutterBluePlus.adapterState.first;
  return state == BluetoothAdapterState.on;
}
```

### Using It Before Scanning

```dart
Future<void> startScanWithPermissions() async {
  final granted = await requestBlePermissions();

  if (!granted) {
    // Show dialog directing user to Settings
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Bluetooth Permission Required'),
        content: const Text(
          'Please grant Bluetooth permission in Settings to use this app.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
    return;
  }

  // All good — start scanning
  await FlutterBluePlus.startScan(timeout: const Duration(seconds: 15));
}
```

## Checking Bluetooth Adapter State

Beyond app permissions, the Bluetooth adapter itself might be off:

```dart
Future<bool> isBluetoothReady(BuildContext context) async {
  final state = await FlutterBluePlus.adapterState.first;

  switch (state) {
    case BluetoothAdapterState.on:
      return true;

    case BluetoothAdapterState.off:
      if (Platform.isAndroid) {
        await FlutterBluePlus.turnOn(); // Prompt user to enable BT on Android
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please turn on Bluetooth')),
        );
      }
      return false;

    case BluetoothAdapterState.unauthorized:
      print('Bluetooth permission denied by user');
      return false;

    case BluetoothAdapterState.unavailable:
      print('Bluetooth not available on this device');
      return false;

    default:
      return false;
  }
}
```

## Troubleshooting: Flutter BLE Not Working

### Flutter BLE Not Working on Android 12+

This is almost always a missing `BLUETOOTH_SCAN` or `BLUETOOTH_CONNECT` permission.

**Checklist:**
- ✅ `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` in AndroidManifest.xml
- ✅ `targetSdkVersion` is 31 or higher
- ✅ Requesting `Permission.bluetoothScan` and `Permission.bluetoothConnect` at runtime
- ✅ User accepted the permission prompt (check they didn't tap "Don't ask again")

### Flutter BLE iOS Not Connecting

Common causes:
- `NSBluetoothAlwaysUsageDescription` missing → app crashes on launch
- User denied Bluetooth permission → redirect to Settings
- App backgrounded without `bluetooth-central` background mode → connection drops

### Flutter Bluetooth Connection Failed: Scan Returns No Results

On Android 10 and below, BLE scanning requires **Location Services to be enabled at the system level** — even if your app has location permission:

```dart
import 'package:geolocator/geolocator.dart';

bool locationEnabled = await Geolocator.isLocationServiceEnabled();
if (!locationEnabled) {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Please enable Location Services for BLE scanning'),
    ),
  );
  return;
}
```

### SecurityException: Need BLUETOOTH_CONNECT Permission

You'll see this crash when accessing `device.platformName` on Android 12 without `BLUETOOTH_CONNECT`. Add the permission and grant it at runtime.

## Testing Your Permission Flow

Always test permission denial flows before shipping.

**Revoke permissions on Android (adb):**
```bash
adb shell pm revoke com.yourapp.id android.permission.BLUETOOTH_SCAN
adb shell pm revoke com.yourapp.id android.permission.BLUETOOTH_CONNECT
```

**Revoke on iOS:** Settings → Privacy & Security → Bluetooth → toggle your app off.

## Quick Permissions Checklist

Before every release, verify:

- [ ] `BLUETOOTH_SCAN` in AndroidManifest (Android 12+)
- [ ] `BLUETOOTH_CONNECT` in AndroidManifest (Android 12+)
- [ ] `BLUETOOTH` + `ACCESS_FINE_LOCATION` in AndroidManifest (Android ≤ 11)
- [ ] `NSBluetoothAlwaysUsageDescription` in Info.plist
- [ ] `NSBluetoothPeripheralUsageDescription` in Info.plist
- [ ] Runtime permission request using `permission_handler`
- [ ] Bluetooth adapter state check before scanning
- [ ] Graceful handling when permission is denied
- [ ] `bluetooth-central` background mode (if needed)

## Summary

Getting BLE permissions right is the unglamorous but essential foundation of every Flutter BLE app. Once configured correctly, you'll never need to touch it again.

With permissions sorted, the natural next step is [building a complete Flutter BLE app](/blog/build-complete-flutter-ble-app) that puts scanning, connecting, and data exchange all together in one project.

For a step-by-step video walkthrough covering every permission edge case — including the Android "deny twice" permanent denial flow and iOS restricted state — the [BLE Flutter Course](https://blefluttercourse.com) has a full dedicated module with tested code for every scenario.
