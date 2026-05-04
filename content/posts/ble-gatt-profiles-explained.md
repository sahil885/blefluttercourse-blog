---
title: "BLE GATT Profiles Explained: Services, Characteristics & UUIDs"
date: "2025-04-20"
excerpt: "GATT is the data model that underpins every BLE connection. This guide breaks down services, characteristics, descriptors, and UUIDs — with Flutter code showing exactly how to work with each."
tags: ["GATT", "BLE Fundamentals", "flutter_blue_plus"]
---

When Flutter developers first connect to a BLE device, they often hit a wall: the device exposes a confusing tree of UUIDs with cryptic names like `0x180D` or `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`, and it's not immediately obvious what any of it means or how to use it.

This guide demystifies GATT completely. By the end you'll know exactly what you're looking at when you call `discoverServices()` — and how to read, write, and subscribe to the data you care about.

---

## What is GATT?

**GATT** stands for Generic Attribute Profile. It's the protocol that defines how two BLE devices exchange data once connected. Think of it as a filing system:

- The filing cabinet is the **device**
- Drawers are **Services** — groups of related functionality
- Folders inside drawers are **Characteristics** — individual pieces of data
- Labels on the folders are **Descriptors** — metadata about that data

Every BLE peripheral exposes a GATT server. Your Flutter app acts as a GATT client — it reads, writes, and subscribes to data on the server.

---

## UUIDs: The Addressing System

Every service, characteristic, and descriptor is identified by a **UUID** (Universally Unique Identifier).

There are two kinds:

### Standard 16-bit UUIDs

The Bluetooth SIG maintains a registry of standard profiles. These use short 16-bit UUIDs:

| UUID | Service |
|------|---------|
| `0x180D` | Heart Rate |
| `0x180A` | Device Information |
| `0x1800` | Generic Access |
| `0x181C` | User Data |
| `0x1810` | Blood Pressure |

These get expanded to full 128-bit UUIDs internally: `0000XXXX-0000-1000-8000-00805F9B34FB` where `XXXX` is the 16-bit value.

### Custom 128-bit UUIDs

Proprietary devices use custom UUIDs that look like this:

```
6E400001-B5A3-F393-E0A9-E50E24DCCA9E
```

This is Nordic Semiconductor's UART service (NUS) — commonly used to send arbitrary text over BLE. Custom UUIDs are device-specific; you get them from the hardware manufacturer's documentation.

---

## Services

A **Service** is a logical grouping of related characteristics. Every peripheral exposes one or more services.

```dart
List<BluetoothService> services = await device.discoverServices();

for (BluetoothService service in services) {
  print('Service UUID: ${service.uuid}');
  print('Is primary: ${service.isPrimary}');
}
```

Common things you'll encounter:

- **Generic Access (0x1800)** — always present; contains device name and appearance
- **Generic Attribute (0x1801)** — always present; handles service change notifications
- **Device Information (0x180A)** — manufacturer name, firmware version, hardware revision
- **Your target service** — whatever the device actually does

---

## Characteristics

A **Characteristic** holds the actual data value. Each characteristic has:

1. **A UUID** identifying what it represents
2. **A value** — an array of bytes
3. **Properties** — what operations are allowed on it

### Properties

```dart
BluetoothCharacteristic c = ...; // from service.characteristics

print(c.properties.read);       // Can you read it?
print(c.properties.write);      // Can you write with response?
print(c.properties.writeWithoutResponse); // Write fire-and-forget
print(c.properties.notify);     // Does it push updates?
print(c.properties.indicate);   // Like notify, but with acknowledgement
```

The properties tell you exactly how to interact with the characteristic.

### Reading a Characteristic

```dart
if (c.properties.read) {
  List<int> bytes = await c.read();
  print('Raw bytes: $bytes');
}
```

The value is always a raw `List<int>`. You'll need to parse it according to the device's specification. For example, a battery level is a single byte (0–100):

```dart
List<int> bytes = await batteryCharacteristic.read();
int batteryLevel = bytes[0]; // 0 to 100
```

### Writing a Characteristic

```dart
// Write with response (device ACKs the write)
if (c.properties.write) {
  await c.write([0x01, 0x02, 0x03]);
}

// Write without response (faster, no ACK — for streaming)
if (c.properties.writeWithoutResponse) {
  await c.write([0x01, 0x02, 0x03], withoutResponse: true);
}
```

### Subscribing to Notifications

For real-time data, use notify or indicate:

```dart
if (c.properties.notify || c.properties.indicate) {
  await c.setNotifyValue(true);

  c.onValueReceived.listen((List<int> value) {
    // Called every time the peripheral pushes new data
    _handleNewData(value);
  });
}
```

Don't forget to unsubscribe when disconnecting:

```dart
await c.setNotifyValue(false);
```

---

## Descriptors

**Descriptors** provide metadata about characteristics. The most important one is the **Client Characteristic Configuration Descriptor (CCCD)**, UUID `0x2902`.

When you call `setNotifyValue(true)`, flutter_blue_plus writes to the CCCD automatically. You typically don't need to interact with descriptors directly unless you're doing something low-level.

```dart
for (BluetoothDescriptor d in c.descriptors) {
  print('Descriptor: ${d.uuid}');
  List<int> value = await d.read();
  print('Value: $value');
}
```

---

## A Complete GATT Walk-Through

Here's a realistic example: connecting to a heart rate monitor and reading live heart rate data.

```dart
Future<void> readHeartRate(BluetoothDevice device) async {
  // 1. Discover all services
  List<BluetoothService> services = await device.discoverServices();

  // 2. Find Heart Rate Service (0x180D)
  BluetoothService? hrService;
  for (var s in services) {
    if (s.uuid.toString().toUpperCase().contains('180D')) {
      hrService = s;
      break;
    }
  }
  if (hrService == null) {
    print('Heart Rate Service not found');
    return;
  }

  // 3. Find Heart Rate Measurement Characteristic (0x2A37)
  BluetoothCharacteristic? hrChar;
  for (var c in hrService.characteristics) {
    if (c.uuid.toString().toUpperCase().contains('2A37')) {
      hrChar = c;
      break;
    }
  }
  if (hrChar == null) return;

  // 4. Subscribe to notifications
  await hrChar.setNotifyValue(true);
  hrChar.onValueReceived.listen((value) {
    // Byte 0: flags. If bit 0 is 0, HR is uint8; if 1, HR is uint16
    int hr;
    if ((value[0] & 0x01) == 0) {
      hr = value[1]; // 8-bit value
    } else {
      hr = value[1] + (value[2] << 8); // 16-bit little-endian
    }
    print('Heart rate: $hr bpm');
  });
}
```

This is the real pattern you'll use for virtually every BLE device — find the service, find the characteristic, interact with it.

---

## Finding the Right UUIDs

When working with a new device, you have a few options for finding UUIDs:

1. **Official documentation** — check the manufacturer's developer docs or SDK
2. **Bluetooth SIG profile specs** — [bluetooth.com/specifications](https://www.bluetooth.com/specifications/specs/) for standard profiles
3. **nRF Connect app** — scan your device with Nordic's app to see all exposed UUIDs live
4. **LightBlue (iOS/macOS)** — another excellent BLE explorer app

---

## Summary

GATT gives BLE its structure:

- **Services** group related functionality (identified by UUID)
- **Characteristics** hold the actual data values (read, write, notify)
- **Descriptors** add metadata (CCCD controls notifications)
- **Properties** tell you exactly how you can interact with each characteristic

Once you understand this hierarchy, any BLE device becomes readable — it's just a matter of finding the right UUIDs and parsing the bytes correctly.

> The [BLE Flutter Mastery course](https://blefluttercourse.com) goes much deeper — including how to decode manufacturer-specific byte formats, work with custom hardware, and build robust real-world BLE apps from scratch.
