---
title: "Flutter BLE Read & Write Characteristics with flutter_blue_plus (2026)"
date: "2025-05-15"
excerpt: "Master reading and writing BLE GATT characteristics in Flutter. Complete examples for flutter_blue_plus including notifications, indications, and handling real-time sensor data."
tags: ["flutter_blue_plus", "GATT", "Characteristics", "Tutorial"]
---

# Flutter BLE Read & Write Characteristics with flutter_blue_plus

Once you've connected to a BLE device in Flutter, the real work begins: reading sensor data, writing commands, and subscribing to real-time notifications. This is where most Flutter BLE tutorials fall short — they show you how to scan, but leave you stranded when it comes to actually exchanging data.

This guide covers everything about reading and writing GATT characteristics using `flutter_blue_plus`, including notifications and handling errors in production apps.

## GATT Recap: Services, Characteristics, Descriptors

Every BLE device exposes its data through a GATT hierarchy:

- **Services** — logical groupings of related functionality (e.g., Heart Rate Service `0x180D`)
- **Characteristics** — individual data points within a service (e.g., Heart Rate Measurement `0x2A37`)
- **Descriptors** — metadata about a characteristic (e.g., CCCD `0x2902`)

Each characteristic has **properties** that determine what you can do with it:
- `read` — request the current value on demand
- `write` — send data to the peripheral
- `writeWithoutResponse` — faster writes, no acknowledgment
- `notify` — device pushes updates to you automatically
- `indicate` — like notify, but with acknowledgment

## Connecting and Discovering Services

Before reading or writing, connect and discover services:

```dart
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

Future<void> connectAndDiscover(BluetoothDevice device) async {
  await device.connect(timeout: const Duration(seconds: 15));

  List<BluetoothService> services = await device.discoverServices();

  for (BluetoothService service in services) {
    print('Service: ${service.serviceUuid}');
    for (BluetoothCharacteristic char in service.characteristics) {
      print('  Char: ${char.characteristicUuid} | Props: ${char.properties}');
    }
  }
}
```

## Reading a Characteristic

```dart
Future<void> readBatteryLevel(BluetoothDevice device) async {
  final services = await device.discoverServices();

  for (final service in services) {
    if (service.serviceUuid == Guid('180F')) { // Battery Service
      for (final char in service.characteristics) {
        if (char.characteristicUuid == Guid('2A19')) { // Battery Level
          if (char.properties.read) {
            List<int> value = await char.read();
            print('Battery: ${value[0]}%');
          }
        }
      }
    }
  }
}
```

## Writing to a Characteristic

```dart
Future<void> writeCharacteristic(
  BluetoothCharacteristic characteristic,
  List<int> data,
) async {
  if (characteristic.properties.write) {
    // Write with response — reliable, slightly slower
    await characteristic.write(data, withoutResponse: false);
  } else if (characteristic.properties.writeWithoutResponse) {
    // Write without response — faster, no confirmation
    await characteristic.write(data, withoutResponse: true);
  }
}

// Examples:
await writeCharacteristic(ledChar, [0x01]);    // Turn on LED
await writeCharacteristic(ledChar, [0x00]);    // Turn off LED
await writeCharacteristic(modeChar, [0x03]);   // Set mode 3
```

### Writing Strings

```dart
import 'dart:convert';

Future<void> writeString(BluetoothCharacteristic char, String text) async {
  final bytes = utf8.encode(text);
  await char.write(bytes);
}

await writeString(commandChar, 'START');
await writeString(commandChar, 'SPEED:75');
```

### Writing Multi-Byte Numbers

```dart
import 'dart:typed_data';

// Write a 16-bit integer (little-endian)
int value = 1000;
await char.write([value & 0xFF, (value >> 8) & 0xFF]);

// Write a 32-bit float
final buffer = ByteData(4);
buffer.setFloat32(0, 3.14159, Endian.little);
await char.write(buffer.buffer.asUint8List());
```

## Setting Up Notifications

Notifications are the most powerful BLE pattern — the device pushes data to your app automatically whenever the value changes. No polling required.

```dart
Future<void> subscribeToNotifications(
  BluetoothCharacteristic characteristic,
) async {
  if (!characteristic.properties.notify && !characteristic.properties.indicate) {
    throw Exception('Characteristic does not support notifications');
  }

  // Enable notifications on the peripheral
  await characteristic.setNotifyValue(true);

  // Listen to incoming data
  characteristic.lastValueStream.listen((value) {
    print('Received ${value.length} bytes: $value');
    _parseData(value);
  });
}

void _parseData(List<int> data) {
  if (data.length >= 2) {
    // Example: 2-byte little-endian temperature in 0.01°C units
    final raw = (data[1] << 8) | data[0];
    final celsius = raw / 100.0;
    print('Temperature: ${celsius.toStringAsFixed(2)}°C');
  }
}
```

Always unsubscribe when done to save battery:
```dart
await characteristic.setNotifyValue(false);
```

## Building a Real-Time Sensor Display

Here's a complete widget that displays live sensor data over BLE notifications:

```dart
class SensorScreen extends StatefulWidget {
  final BluetoothDevice device;
  const SensorScreen({super.key, required this.device});

  @override
  State<SensorScreen> createState() => _SensorScreenState();
}

class _SensorScreenState extends State<SensorScreen> {
  StreamSubscription<List<int>>? _subscription;
  String _reading = '--';
  bool _connected = false;

  static final _serviceUuid = Guid('12345678-1234-1234-1234-123456789012');
  static final _charUuid    = Guid('12345678-1234-1234-1234-123456789013');

  @override
  void initState() {
    super.initState();
    _connectAndSubscribe();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    widget.device.disconnect();
    super.dispose();
  }

  Future<void> _connectAndSubscribe() async {
    await widget.device.connect();
    final services = await widget.device.discoverServices();

    for (final service in services) {
      if (service.serviceUuid == _serviceUuid) {
        for (final char in service.characteristics) {
          if (char.characteristicUuid == _charUuid && char.properties.notify) {
            await char.setNotifyValue(true);
            _subscription = char.lastValueStream.listen((data) {
              if (data.length >= 2 && mounted) {
                final raw = (data[1] << 8) | data[0];
                setState(() => _reading = '${(raw / 10.0).toStringAsFixed(1)} °C');
              }
            });
            setState(() => _connected = true);
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.device.platformName),
        actions: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(
              Icons.circle,
              color: _connected ? Colors.green : Colors.red,
              size: 14,
            ),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.thermostat, size: 64, color: Colors.orange),
            const SizedBox(height: 8),
            Text(
              _reading,
              style: const TextStyle(fontSize: 64, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Increasing MTU for Large Data Transfers

By default, BLE packets are limited to 23 bytes. For larger payloads (e.g., firmware chunks, image data), request a higher MTU after connecting:

```dart
await device.requestMtu(512); // Up to 512 bytes per packet
final currentMtu = await device.mtu.first;
print('MTU: $currentMtu');
```

## Error Handling

```dart
Future<List<int>> safeRead(BluetoothCharacteristic char) async {
  try {
    return await char.read();
  } on FlutterBluePlusException catch (e) {
    print('BLE error ${e.errorCode}: ${e.description}');
    return [];
  } catch (e) {
    print('Unexpected error: $e');
    return [];
  }
}

Future<bool> safeWrite(BluetoothCharacteristic char, List<int> data) async {
  try {
    await char.write(data);
    return true;
  } on FlutterBluePlusException catch (e) {
    print('Write failed: ${e.description}');
    return false;
  }
}
```

## Performance Tips

**Use `writeWithoutResponse` for high-frequency writes** — streaming data like audio samples or frequent sensor commands benefit from removing the ACK round-trip.

**Cache characteristic references** — call `discoverServices()` once on connect and store references to the characteristics you need. Don't call it repeatedly.

**Add delays between rapid writes** — some peripherals need a small gap between commands:
```dart
await char.write([0x01]);
await Future.delayed(const Duration(milliseconds: 50));
await char.write([0x02]);
```

## Common Issues

**Notifications not arriving on iOS** — call `setNotifyValue(true)` *after* `discoverServices()` completes.

**"Characteristic not found"** — always call `discoverServices()` fresh after each new connection. Don't reuse service/characteristic objects across reconnections.

**Write timeout** — if your peripheral is slow, use `withoutResponse: true` or add a delay between writes.

## Next Steps

With read/write and notifications mastered, the next critical skill is setting up [Flutter BLE permissions correctly for Android and iOS](/blog/flutter-ble-permissions-android-ios). Or jump straight into the [complete Flutter BLE app tutorial](/blog/build-complete-flutter-ble-app) to see all of this working together in a real project.

For production-level topics — background BLE, OTA firmware updates, bonding, and handling multiple simultaneous connections — the [BLE Flutter Course](https://blefluttercourse.com) has you covered with full source code and real hardware examples.
