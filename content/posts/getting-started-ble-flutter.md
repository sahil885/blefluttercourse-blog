---
title: "Getting Started with Bluetooth Low Energy in Flutter"
date: "2025-04-10"
excerpt: "A practical beginner's guide to BLE development in Flutter. Learn the core concepts — scanning, connecting, reading characteristics — with working code examples."
tags: ["BLE Basics", "flutter_blue_plus", "Beginner"]
---

Bluetooth Low Energy (BLE) has become the backbone of modern IoT, wearables, fitness trackers, smart home devices, and medical hardware. If you're a Flutter developer, chances are you'll need to talk to a BLE device at some point — and when that moment comes, you want to be ready.

This guide gives you a solid foundation: what BLE actually is, how it maps to Flutter's plugin ecosystem, and how to write your first working scan and connect flow.

---

## What is Bluetooth Low Energy?

BLE is a power-efficient variant of Bluetooth introduced in Bluetooth 4.0. Unlike Classic Bluetooth (used for audio streaming, file transfer), BLE is designed for small, infrequent bursts of data. Think: a heart rate monitor sending a beat every second, or a smart lock checking your phone's proximity.

The key trade-off: **low power consumption** in exchange for **lower throughput**. For most IoT and wearable use cases, that's exactly what you want.

---

## Core BLE Concepts You Must Know

Before writing a single line of Flutter code, you need to understand the BLE hierarchy:

### Central vs. Peripheral

Every BLE connection has two roles:

- **Peripheral** — the device advertising itself (your sensor, wearable, beacon)
- **Central** — the device that scans and connects (your phone running Flutter)

In Flutter, your app is always the **central**. You scan for peripherals, you initiate connections, you read/write data.

### GATT: The Data Layer

Once connected, BLE devices communicate through **GATT** (Generic Attribute Profile). GATT organises data in a strict hierarchy:

```
Device
└── Service (e.g. Heart Rate Service)
    └── Characteristic (e.g. Heart Rate Measurement)
        └── Descriptor (e.g. Client Characteristic Configuration)
```

- **Services** group related functionality (identified by a UUID)
- **Characteristics** hold the actual data values — you read, write, or subscribe to these
- **Descriptors** provide metadata about a characteristic

### UUIDs

Every service and characteristic is identified by a **UUID** — either a standard 16-bit UUID (from the Bluetooth SIG spec) or a custom 128-bit UUID (for proprietary devices). You'll be copy-pasting these a lot.

---

## Setting Up flutter_blue_plus

The go-to BLE package for Flutter in 2025 is [flutter_blue_plus](https://pub.dev/packages/flutter_blue_plus). It has solid cross-platform support, an active maintainer, and a clean API.

### 1. Add the dependency

```yaml
dependencies:
  flutter_blue_plus: ^1.31.0
```

### 2. Configure permissions

**Android** — add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

**iOS** — add to `ios/Runner/Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to communicate with BLE devices.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app uses Bluetooth to communicate with BLE devices.</string>
```

---

## Scanning for Devices

Here's a minimal working scan:

```dart
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

Future<void> startScan() async {
  // Check if Bluetooth is on
  if (await FlutterBluePlus.adapterState.first != BluetoothAdapterState.on) {
    print('Bluetooth is off');
    return;
  }

  // Start scanning for 10 seconds
  await FlutterBluePlus.startScan(timeout: const Duration(seconds: 10));

  // Listen to scan results
  FlutterBluePlus.scanResults.listen((results) {
    for (ScanResult r in results) {
      print('${r.device.platformName} | RSSI: ${r.rssi}');
    }
  });
}
```

A few things to note:

- `scanResults` is a stream — results accumulate as devices are discovered
- `rssi` is the signal strength in dBm. Closer to 0 = stronger signal (e.g. -50 is stronger than -90)
- Always call `FlutterBluePlus.stopScan()` when you're done to save battery

---

## Connecting to a Device

Once you've found your target device in scan results:

```dart
Future<void> connectToDevice(BluetoothDevice device) async {
  try {
    await device.connect(timeout: const Duration(seconds: 10));
    print('Connected to ${device.platformName}');
  } catch (e) {
    print('Connection failed: $e');
  }
}
```

Always handle errors here — BLE connections fail more often than you'd expect due to range, interference, or firmware quirks.

---

## Discovering Services and Reading a Characteristic

After connecting, discover the device's GATT services:

```dart
Future<void> discoverServices(BluetoothDevice device) async {
  List<BluetoothService> services = await device.discoverServices();

  for (BluetoothService service in services) {
    print('Service: ${service.uuid}');

    for (BluetoothCharacteristic c in service.characteristics) {
      print('  Characteristic: ${c.uuid} | properties: ${c.properties}');

      // Read a characteristic if it supports it
      if (c.properties.read) {
        List<int> value = await c.read();
        print('  Value: $value');
      }
    }
  }
}
```

---

## Subscribing to Notifications

For real-time data (sensor readings, heart rate, etc.), you don't poll — you **subscribe**:

```dart
Future<void> subscribeToCharacteristic(BluetoothCharacteristic c) async {
  await c.setNotifyValue(true);

  c.onValueReceived.listen((value) {
    print('Received: $value');
    // Parse your bytes here
  });
}
```

This is far more efficient than repeated reads — the peripheral pushes data to you whenever it changes.

---

## What's Next?

You now have the foundation: you can scan, connect, discover services, read characteristics, and subscribe to notifications. That covers roughly 80% of real-world BLE apps.

The remaining 20% — writing data, handling disconnections gracefully, background BLE, pairing, custom hardware protocols, and production-hardening — is where things get genuinely interesting.

> Want to go from these basics to building production-grade BLE apps? The [BLE Flutter Mastery course](https://blefluttercourse.com) covers everything in depth, with real hardware projects and a structured learning path.
