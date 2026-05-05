---
title: "Flutter BLE Scanning: How to Scan and Discover Bluetooth Devices (2026 Guide)"
date: "2025-05-10"
excerpt: "Learn how to scan and discover Bluetooth Low Energy devices in Flutter using flutter_blue_plus. Complete code examples for Android and iOS with permissions handling."
tags: ["flutter_blue_plus", "BLE Scanning", "Tutorial"]
---

# Flutter BLE Scanning: How to Scan and Discover Bluetooth Devices

Scanning for Bluetooth Low Energy devices is the first step in every Flutter BLE app. Whether you're building a fitness tracker companion, a smart home controller, or an industrial IoT dashboard, you need to reliably discover nearby BLE peripherals before you can connect to them.

This tutorial covers everything you need to know about BLE scanning in Flutter using `flutter_blue_plus` — the most popular and actively maintained Bluetooth package for Flutter in 2026.

## Prerequisites

Before diving in, make sure you have:
- Flutter SDK 3.x installed
- `flutter_blue_plus` added to your `pubspec.yaml`
- Basic understanding of Flutter widgets and async/await

```yaml
dependencies:
  flutter_blue_plus: ^1.32.0
```

## Understanding BLE Scanning

BLE scanning works by having your phone's Bluetooth radio listen for advertising packets broadcast by nearby peripherals. Every BLE device continuously broadcasts a small packet of data — the **advertising payload** — that includes:

- Device name
- Service UUIDs it supports
- Manufacturer-specific data
- Signal strength (RSSI)

Your Flutter app captures these packets and surfaces them as `ScanResult` objects.

## Setting Up Permissions

### Android (AndroidManifest.xml)

```xml
<!-- Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- Android 11 and below -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
```

### iOS (Info.plist)

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to connect to BLE devices.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app uses Bluetooth to connect to BLE devices.</string>
```

## Basic BLE Scanning in Flutter

```dart
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

Future<void> startScan() async {
  if (await FlutterBluePlus.adapterState.first != BluetoothAdapterState.on) {
    print('Bluetooth is off');
    return;
  }

  await FlutterBluePlus.startScan(timeout: const Duration(seconds: 15));

  FlutterBluePlus.scanResults.listen((results) {
    for (ScanResult result in results) {
      print('Found: ${result.device.platformName} | RSSI: ${result.rssi}');
    }
  });
}
```

## Building a Scan Screen UI

```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final Map<DeviceIdentifier, ScanResult> _resultsMap = {};
  bool _isScanning = false;
  StreamSubscription<List<ScanResult>>? _scanSubscription;

  @override
  void dispose() {
    _scanSubscription?.cancel();
    FlutterBluePlus.stopScan();
    super.dispose();
  }

  Future<void> _startScan() async {
    setState(() {
      _resultsMap.clear();
      _isScanning = true;
    });

    _scanSubscription = FlutterBluePlus.scanResults.listen((results) {
      setState(() {
        for (final r in results) {
          _resultsMap[r.device.remoteId] = r;
        }
      });
    });

    await FlutterBluePlus.startScan(timeout: const Duration(seconds: 15));
    setState(() => _isScanning = false);
  }

  @override
  Widget build(BuildContext context) {
    final devices = _resultsMap.values.toList()
      ..sort((a, b) => b.rssi.compareTo(a.rssi));

    return Scaffold(
      appBar: AppBar(title: const Text('Scan for BLE Devices')),
      body: Column(
        children: [
          if (_isScanning) const LinearProgressIndicator(),
          Expanded(
            child: ListView.builder(
              itemCount: devices.length,
              itemBuilder: (context, index) {
                final result = devices[index];
                return ListTile(
                  leading: const Icon(Icons.bluetooth),
                  title: Text(result.device.platformName.isEmpty
                      ? 'Unknown Device'
                      : result.device.platformName),
                  subtitle: Text(result.device.remoteId.toString()),
                  trailing: Text('${result.rssi} dBm'),
                  onTap: () => _connectToDevice(result.device),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isScanning ? FlutterBluePlus.stopScan : _startScan,
        label: Text(_isScanning ? 'Stop' : 'Scan'),
        icon: Icon(_isScanning ? Icons.stop : Icons.bluetooth_searching),
      ),
    );
  }

  void _connectToDevice(BluetoothDevice device) {
    FlutterBluePlus.stopScan();
    // Navigate to device screen
  }
}
```

## Filtering Scan Results

### Filter by Service UUID

If you know the service UUID your device advertises, filter to only show relevant devices:

```dart
await FlutterBluePlus.startScan(
  withServices: [Guid('180D')], // Heart Rate Service
  timeout: const Duration(seconds: 10),
);
```

### Filter by Signal Strength (RSSI)

Only show devices within a certain range:

```dart
FlutterBluePlus.scanResults.listen((results) {
  final nearby = results.where((r) => r.rssi > -70).toList();
});
```

### Find a Specific Device

Scan until you find the device you want, then stop automatically:

```dart
Future<BluetoothDevice?> findDevice(String targetName) async {
  final completer = Completer<BluetoothDevice?>();

  final subscription = FlutterBluePlus.scanResults.listen((results) {
    for (final result in results) {
      if (result.device.platformName == targetName) {
        completer.complete(result.device);
      }
    }
  });

  await FlutterBluePlus.startScan(timeout: const Duration(seconds: 30));

  final device = await completer.future.timeout(
    const Duration(seconds: 30),
    onTimeout: () => null,
  );

  await FlutterBluePlus.stopScan();
  subscription.cancel();
  return device;
}
```

## Handling Bluetooth State Changes

Always handle the case where the user turns off Bluetooth mid-scan:

```dart
@override
void initState() {
  super.initState();
  FlutterBluePlus.adapterState.listen((state) {
    if (state == BluetoothAdapterState.off) {
      FlutterBluePlus.stopScan();
      setState(() => _isScanning = false);
    }
  });
}
```

## Common Scanning Issues and Fixes

**No devices showing up on Android?**
- Grant location permission on Android 10 and below
- Enable Location Services in device settings
- Request `BLUETOOTH_SCAN` on Android 12+

**Scan stops immediately on iOS?**
- iOS requires the app to be in the foreground for BLE scanning
- Set a longer timeout value

**Duplicate devices in the list?**
Use a Map keyed by `DeviceIdentifier` to deduplicate (as shown in the scan screen example above).

## Next Steps

Now that you can discover BLE devices, the next step is connecting and reading their data. Check out our guide on [Flutter BLE Read & Write Characteristics](/blog/flutter-ble-read-write-characteristics), or jump into the [Complete Flutter BLE App tutorial](/blog/build-complete-flutter-ble-app).

Want to go from tutorial to production? The [BLE Flutter Course](https://blefluttercourse.com) covers scanning, connecting, GATT characteristics, notifications, background BLE, and deploying real apps — with full source code and video walkthroughs.
