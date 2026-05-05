---
title: "BLE GATT Profiles Explained: Services, Characteristics & Descriptors for Flutter Developers"
date: "2026-03-20"
description: "A deep dive into BLE GATT profiles, services, characteristics, and descriptors — and how to work with them using flutter_blue_plus in your Flutter apps."
tags: ["BLE", "GATT", "Flutter", "Bluetooth", "flutter_blue_plus"]
---

> **TL;DR:** GATT (Generic Attribute Profile) is the data communication backbone of BLE. Every BLE device exposes a hierarchy: **Profile → Services → Characteristics → Descriptors**. In Flutter, you use `flutter_blue_plus` to discover services, read/write characteristics, and subscribe to notifications. This article explains every layer of GATT and shows you exactly how to interact with it in Dart code.

# BLE GATT Profiles Explained: Services, Characteristics & Descriptors for Flutter Developers

If you've ever connected to a BLE device in Flutter and wondered what to do next, the answer lies in GATT. Understanding GATT is the difference between blindly guessing at UUIDs and confidently building robust BLE applications. This guide breaks down the entire GATT hierarchy and shows you how to work with it in Flutter.

---

## What Is GATT?

**GATT** stands for **Generic Attribute Profile**. It's the protocol that defines how two BLE devices transfer data once a connection has been established. GATT sits on top of the ATT (Attribute Protocol) layer and provides a structured way to organize and access data.

Every BLE peripheral (a heart rate monitor, smart lock, IoT sensor) exposes its data through GATT. The central device (your Flutter app) discovers and interacts with that data using the GATT client role.

### GATT vs. GAP

Many developers confuse GATT and GAP (Generic Access Profile). Here's the distinction:

| Layer | Purpose |
|-------|---------|
| **GAP** | Controls advertising, discovery, and connection establishment |
| **GATT** | Controls data exchange after connection |

GAP gets you connected. GATT is what you do once connected. If you're reading this after learning to [scan and connect to BLE devices in Flutter](/posts/flutter-ble-scanning-guide), GATT is your natural next step.

---

## The GATT Hierarchy

GATT organizes data in a strict four-level hierarchy:

```
Profile
└── Service (e.g., Heart Rate Service)
    └── Characteristic (e.g., Heart Rate Measurement)
        └── Descriptor (e.g., Client Characteristic Configuration)
```

### 1. Profile

A **GATT Profile** is a high-level definition of how a device should behave for a specific use case. It's not transmitted over the air — it's a specification document that defines which services a device must implement.

Examples of standard profiles:
- **Heart Rate Profile** — for fitness devices
- **Blood Pressure Profile** — for medical monitors
- **Cycling Speed and Cadence Profile** — for bike sensors
- **Custom Profiles** — for your own IoT devices

The Bluetooth SIG maintains a [library of standard profiles](https://www.bluetooth.com/specifications/specs/), but you can always define your own custom profile.

### 2. Services

A **Service** is a collection of related data and behaviors. Each service is identified by a **UUID** (Universally Unique Identifier).

**Standard (short) UUIDs** are 16-bit and defined by the Bluetooth SIG:
- `0x180D` — Heart Rate Service
- `0x180F` — Battery Service
- `0x1800` — Generic Access Service
- `0x1801` — Generic Attribute Service

**Custom (long) UUIDs** are 128-bit and look like:
```
6E400001-B5A3-F393-E0A9-E50E24DCCA9E
```

In Flutter with `flutter_blue_plus`, you discover services after connecting:

```dart
// Discover services on connected device
List<BluetoothService> services = await device.discoverServices();

for (BluetoothService service in services) {
  print('Service UUID: ${service.uuid}');
  print('Is primary: ${service.isPrimary}');
}
```

### 3. Characteristics

A **Characteristic** is the actual data container within a service. It holds a value (up to 512 bytes) and defines how that value can be accessed. Each characteristic has:

- **UUID** — identifies what data it holds
- **Value** — the actual data bytes
- **Properties** — what operations are permitted
- **Descriptors** — metadata about the characteristic

#### Characteristic Properties

| Property | Description |
|----------|-------------|
| **Read** | Central can read the current value |
| **Write** | Central can write a new value (with response) |
| **Write Without Response** | Central can write without acknowledgment (faster) |
| **Notify** | Peripheral pushes updates to central (no acknowledgment) |
| **Indicate** | Peripheral pushes updates with acknowledgment |
| **Broadcast** | Value can be included in advertising packets |

```dart
// Access characteristics within a service
for (BluetoothCharacteristic characteristic in service.characteristics) {
  print('Characteristic UUID: ${characteristic.uuid}');
  
  // Check properties
  bool canRead = characteristic.properties.read;
  bool canWrite = characteristic.properties.write;
  bool canNotify = characteristic.properties.notify;
  bool canIndicate = characteristic.properties.indicate;
  
  print('Read: $canRead, Write: $canWrite, Notify: $canNotify');
}
```

### 4. Descriptors

**Descriptors** provide metadata about a characteristic. The most important descriptor is the **Client Characteristic Configuration Descriptor (CCCD)** with UUID `0x2902`.

The CCCD controls notification/indication subscriptions. When you enable notifications in Flutter, you're actually writing to this descriptor:

```dart
// Enable notifications (flutter_blue_plus handles CCCD automatically)
await characteristic.setNotifyValue(true);
```

Other common descriptors:
- `0x2901` — Characteristic User Description (human-readable name)
- `0x2904` — Characteristic Presentation Format (data type info)

---

## Reading Characteristics in Flutter

```dart
// Read a characteristic value
BluetoothCharacteristic targetChar = /* find your characteristic */;

if (targetChar.properties.read) {
  List<int> value = await targetChar.read();
  print('Raw bytes: $value');
  
  // Convert to string
  String stringValue = String.fromCharCodes(value);
  
  // Convert to integer (little-endian)
  int intValue = value[0] | (value[1] << 8);
  
  print('String: $stringValue, Int: $intValue');
}
```

For a complete guide to reading and writing, see our [Flutter BLE Read/Write Characteristics guide](/posts/flutter-ble-read-write-characteristics).

---

## Writing Characteristics in Flutter

```dart
// Write to a characteristic
if (targetChar.properties.write) {
  // Write string data
  List<int> bytesToWrite = 'Hello Device'.codeUnits;
  await targetChar.write(bytesToWrite, withoutResponse: false);
  
  // Write numeric command
  await targetChar.write([0x01, 0x02], withoutResponse: false);
}

// Write without response (faster, use for streaming commands)
if (targetChar.properties.writeWithoutResponse) {
  await targetChar.write([0xFF], withoutResponse: true);
}
```

---

## Subscribing to Notifications

Notifications are the most powerful GATT feature for real-time data. Instead of polling (reading repeatedly), the device pushes data to you whenever it changes.

```dart
// Subscribe to notifications
if (characteristic.properties.notify) {
  await characteristic.setNotifyValue(true);
  
  // Listen to the stream
  characteristic.lastValueStream.listen((value) {
    print('Received notification: $value');
    
    // Parse heart rate data (standard format)
    if (value.isNotEmpty) {
      int heartRate = value[1]; // Byte 0 is flags, byte 1 is HR value
      print('Heart rate: $heartRate bpm');
    }
  });
}

// Don't forget to unsubscribe when done
await characteristic.setNotifyValue(false);
```

### Notifications vs. Indications

| Feature | Notify | Indicate |
|---------|--------|---------|
| Acknowledgment | No | Yes |
| Speed | Faster | Slower |
| Reliability | Best-effort | Guaranteed |
| Use case | Streaming data | Critical commands |

---

## Finding a Specific Characteristic by UUID

In real apps, you'll usually know the UUID you're looking for. Here's a clean helper function:

```dart
BluetoothCharacteristic? findCharacteristic(
  List<BluetoothService> services,
  String serviceUuid,
  String characteristicUuid,
) {
  for (var service in services) {
    if (service.uuid.toString().toLowerCase() == serviceUuid.toLowerCase()) {
      for (var char in service.characteristics) {
        if (char.uuid.toString().toLowerCase() == characteristicUuid.toLowerCase()) {
          return char;
        }
      }
    }
  }
  return null;
}

// Usage
const String HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const String HR_MEASUREMENT_CHAR = '00002a37-0000-1000-8000-00805f9b34fb';

List<BluetoothService> services = await device.discoverServices();
BluetoothCharacteristic? hrChar = findCharacteristic(
  services, 
  HEART_RATE_SERVICE, 
  HR_MEASUREMENT_CHAR,
);
```

---

## Working with Custom GATT Profiles

Most IoT projects use custom GATT profiles. Here's a pattern for organizing custom UUIDs:

```dart
class MyDeviceGatt {
  // Service UUID
  static const String SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  
  // Characteristic UUIDs
  static const String TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write
  static const String RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify
  
  // Commands
  static const int CMD_START = 0x01;
  static const int CMD_STOP = 0x02;
  static const int CMD_RESET = 0xFF;
}

// Usage
class BleManager {
  BluetoothCharacteristic? _txChar;
  BluetoothCharacteristic? _rxChar;
  
  Future<void> setup(BluetoothDevice device) async {
    final services = await device.discoverServices();
    
    for (var service in services) {
      if (service.uuid.toString() == MyDeviceGatt.SERVICE_UUID) {
        for (var char in service.characteristics) {
          String uuid = char.uuid.toString();
          if (uuid == MyDeviceGatt.TX_CHAR_UUID) _txChar = char;
          if (uuid == MyDeviceGatt.RX_CHAR_UUID) _rxChar = char;
        }
      }
    }
    
    // Enable notifications on RX
    if (_rxChar != null) {
      await _rxChar!.setNotifyValue(true);
      _rxChar!.lastValueStream.listen(_handleIncoming);
    }
  }
  
  void _handleIncoming(List<int> data) {
    print('Received: $data');
  }
  
  Future<void> sendCommand(int command) async {
    await _txChar?.write([command], withoutResponse: true);
  }
}
```

This is the pattern you'll use in an [ESP32 + Flutter BLE project](/posts/esp32-vs-arduino-flutter-ble) where you define your own GATT services.

---

## GATT Error Handling

Production BLE apps need robust error handling around GATT operations:

```dart
Future<List<int>?> safeRead(BluetoothCharacteristic char) async {
  try {
    if (!char.properties.read) {
      throw Exception('Characteristic does not support read');
    }
    return await char.read().timeout(
      const Duration(seconds: 5),
      onTimeout: () => throw TimeoutException('Read timed out'),
    );
  } on FlutterBluePlusException catch (e) {
    print('BLE error: ${e.errorCode} - ${e.description}');
    return null;
  } catch (e) {
    print('Unexpected error: $e');
    return null;
  }
}
```

---

## Standard GATT UUIDs Reference

### Common Service UUIDs

| Service | UUID |
|---------|------|
| Generic Access | 0x1800 |
| Generic Attribute | 0x1801 |
| Device Information | 0x180A |
| Battery Service | 0x180F |
| Heart Rate | 0x180D |
| Blood Pressure | 0x1810 |
| Health Thermometer | 0x1809 |
| Running Speed & Cadence | 0x1814 |
| Cycling Speed & Cadence | 0x1816 |

### Common Characteristic UUIDs

| Characteristic | UUID |
|---------------|------|
| Device Name | 0x2A00 |
| Appearance | 0x2A01 |
| Battery Level | 0x2A19 |
| Heart Rate Measurement | 0x2A37 |
| Body Temperature | 0x2A1C |
| Firmware Revision | 0x2A26 |

---

## BLE GATT and MTU Size

The **MTU (Maximum Transmission Unit)** limits how much data you can send in a single GATT operation. The default BLE MTU is 23 bytes, but you can negotiate a larger MTU:

```dart
// Request larger MTU
int mtu = await device.requestMtu(512);
print('Negotiated MTU: $mtu bytes');
// Actual payload = MTU - 3 bytes (ATT header)
int maxPayload = mtu - 3;
```

For large data transfers, you'll need to implement chunking:

```dart
Future<void> writeChunked(BluetoothCharacteristic char, List<int> data) async {
  final int mtu = (await char.device.mtu.first) - 3;
  
  for (int i = 0; i < data.length; i += mtu) {
    final chunk = data.sublist(i, (i + mtu).clamp(0, data.length));
    await char.write(chunk, withoutResponse: true);
    await Future.delayed(const Duration(milliseconds: 10));
  }
}
```

---

## Explore More on the Blog

Expand your Flutter BLE knowledge with these related guides:

- 🚀 **[Getting Started with BLE in Flutter](/posts/getting-started-ble-flutter)** — Foundations before diving into GATT
- 📡 **[Flutter BLE Scanning & Device Discovery](/posts/flutter-ble-scanning-guide)** — Find devices before connecting
- 📖 **[Reading & Writing BLE Characteristics in Flutter](/posts/flutter-ble-read-write-characteristics)** — Deep dive into GATT data operations
- 🔧 **[Flutter BLE Permissions for Android & iOS](/posts/flutter-ble-permissions-android-ios)** — Handle permissions properly
- 🏗️ **[Build a Complete Flutter BLE App](/posts/build-complete-flutter-ble-app)** — Put it all together
- 📦 **[flutter_blue_plus vs flutter_blue: Which Package to Use?](/posts/flutter-blue-vs-flutter-blue-plus)** — Package comparison
- ⚖️ **[Flutter BLE Packages Comparison](/posts/flutter-ble-packages-comparison)** — All BLE packages compared
- ⚡ **[BLE vs Classic Bluetooth in Flutter](/posts/ble-vs-classic-bluetooth-flutter)** — When to use which protocol
- 🤖 **[ESP32 vs Arduino for Flutter BLE Projects](/posts/esp32-vs-arduino-flutter-ble)** — Best hardware for custom GATT
- 📱 **[Flutter vs React Native for BLE Development](/posts/flutter-vs-react-native-ble)** — Cross-platform comparison
- 🤖 **[Flutter BLE vs Native Android (Kotlin)](/posts/flutter-ble-vs-native-android-kotlin)** — Flutter vs native approach
- 🌐 **[BLE vs WiFi for Flutter IoT Projects](/posts/ble-vs-wifi-flutter-iot)** — Connectivity protocol comparison

---

## Frequently Asked Questions

### What is a GATT profile and how is it different from a service?
A GATT profile is a high-level specification that defines a use case (like Heart Rate Monitoring). It specifies which services a device must implement. A service is the actual implementation — a collection of characteristics. Think of the profile as the blueprint and the service as the built room.

### How do I find the UUID of a BLE device's services?
Use a BLE scanner app like **nRF Connect** (iOS/Android) to discover and inspect a device's services, characteristics, and descriptors before writing code. You can also use `device.discoverServices()` in Flutter and print all UUIDs to your debug console.

### What's the difference between notify and indicate in GATT?
Both push data from the peripheral to your app, but **Notify** is fire-and-forget (no acknowledgment from the central), while **Indicate** requires the central to acknowledge each packet. Use Notify for high-speed streaming data; use Indicate for critical commands that must be confirmed.

### Why does `discoverServices()` sometimes throw an error?
Service discovery can fail if: (1) the device disconnects during discovery, (2) the GATT server is not ready, or (3) you call it too quickly after connecting. Add a short delay after connection and wrap in try/catch with reconnection logic. See [Flutter BLE permissions and connection guide](/posts/flutter-ble-permissions-android-ios) for full setup patterns.

### Can I communicate with any BLE device using Flutter?
Yes, as long as you know the service and characteristic UUIDs. Standard Bluetooth SIG profiles (heart rate, battery, etc.) have published UUIDs. Custom devices (like ESP32 projects) require you to define and document your own UUIDs.

### What's the fastest way to master BLE GATT in Flutter?
The fastest path is structured learning rather than piecing together Stack Overflow answers. The **[BLE Flutter Course](https://blefluttercourse.com/)** covers the entire GATT hierarchy with real hardware projects — you'll wire up sensors, read characteristics, and build production apps step by step.

---

## Start Building with GATT Today

Understanding GATT transforms BLE development from guesswork into a systematic process. You know the hierarchy, you know how to discover services, read and write characteristics, and subscribe to notifications.

**Your next steps:**
1. Connect to a BLE device and run `discoverServices()` — explore the raw GATT structure
2. Identify whether your device uses standard or custom UUIDs
3. Implement read, write, and notify operations
4. Build your [complete Flutter BLE app](/posts/build-complete-flutter-ble-app)

Ready to go deeper? The **[BLE Flutter Course](https://blefluttercourse.com/)** walks you through building real projects with real BLE hardware — ESP32, Arduino, and more. Every GATT concept in this article is covered with hands-on labs and working source code.

👉 **[Enroll in the BLE Flutter Course →](https://blefluttercourse.com/)**
