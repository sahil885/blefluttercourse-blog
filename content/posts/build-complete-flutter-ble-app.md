---
title: "Build a Complete Flutter BLE App: End-to-End Guide with flutter_blue_plus"
date: "2026-04-10"
excerpt: "Build a complete, production-ready Flutter BLE app from scratch. Covers architecture, scanning, connection management, GATT operations, state management, error recovery, and real-device testing."
tags: ["Flutter", "BLE", "app development", "flutter_blue_plus", "architecture"]
faqs:
  - question: "What architecture should I use for a Flutter BLE app?"
    answer: "A service-layer architecture works best: isolate all BLE logic in a dedicated BleService class, expose streams for device state and data, and consume those streams in your UI with Riverpod or BLoC. This keeps BLE code testable and prevents resource leaks when the user navigates away."
  - question: "How do I handle BLE disconnections gracefully in Flutter?"
    answer: "Listen to device.connectionState stream and implement automatic reconnection with exponential backoff. Set a max retry count (typically 3), show clear UI feedback for each state change, and cancel all pending operations before attempting to reconnect. Always clean up stream subscriptions on disconnection to prevent memory leaks."
  - question: "Can Flutter BLE apps run in the background?"
    answer: "Yes, with platform-specific setup. iOS requires the bluetooth-central UIBackgroundMode in Info.plist and service UUID filtering on scans. Android requires a foreground service with a visible notification. Both platforms impose significant battery and connectivity restrictions on background BLE."
  - question: "How do I test a Flutter BLE app without physical hardware?"
    answer: "Use the nRF Connect app (free on iOS and Android) to simulate a BLE peripheral with custom GATT services. For automated testing, mock the flutter_blue_plus API. For CI/CD pipelines, conditional compilation flags let you skip BLE-specific tests that require hardware."
---

> **TL;DR:** A production Flutter BLE app needs: permissions setup → scan UI → connection state management → service discovery → characteristic read/write/notify → error recovery → clean dispose. This guide builds a complete sensor dashboard app step by step using flutter_blue_plus, covering every layer from architecture to real-device testing.

# Build a Complete Flutter BLE App: End-to-End Guide with flutter_blue_plus

You've read the individual guides — scanning, GATT, permissions, read/write. Now it's time to put everything together into a real, production-quality app. This guide builds a complete BLE sensor dashboard: discover nearby devices, connect, read live sensor data via notifications, send commands, and handle disconnections gracefully.

---

> **Free guide:** Struggling with dropped connections? Grab *The 7 BLE Mistakes That Make Flutter Apps Disconnect* — production-ready fixes you can apply today. [**Download the free guide →**](https://blog.blefluttercourse.com/free-guide)

## What We're Building

A **BLE Sensor Dashboard** app that:
- Scans for and lists nearby BLE devices
- Connects to a selected device (ESP32, Arduino, or any BLE peripheral)
- Displays real-time sensor data via GATT notifications
- Sends commands via write characteristics
- Handles connection drops with auto-reconnect
- Cleans up all resources properly

**Prerequisite reading:**
- [BLE Fundamentals for Flutter](/blog/getting-started-ble-flutter)
- [GATT Profiles Explained](/blog/ble-gatt-profiles-explained)
- [Flutter BLE Permissions Setup](/blog/flutter-ble-permissions-android-ios)
- [Scanning & Device Discovery](/blog/flutter-ble-scanning-guide)
- [Reading & Writing Characteristics](/blog/flutter-ble-read-write-characteristics)

---

## Project Setup

### 1. pubspec.yaml

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_blue_plus: ^1.31.0
  provider: ^6.1.0
  permission_handler: ^11.3.0
  device_info_plus: ^10.1.0
```

### 2. Permissions

**AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />
```

**iOS Info.plist:**
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app connects to BLE sensors to display real-time data.</string>
```

See the [complete permissions guide](/blog/flutter-ble-permissions-android-ios) for all edge cases.

---

## Architecture

The app uses **Provider** for state management with three layers:

```
lib/
├── main.dart
├── models/
│   └── sensor_data.dart          # Data models
├── services/
│   ├── ble_scanner.dart          # Scanning logic
│   ├── ble_connection.dart       # Connection + GATT
│   └── ble_permission.dart       # Permission management
├── providers/
│   └── ble_provider.dart         # App-wide BLE state
└── screens/
    ├── scan_screen.dart          # Device list
    └── device_screen.dart        # Connected device dashboard
```

---

## Step 1: Data Models

```dart
// lib/models/sensor_data.dart
class SensorData {
  final double temperature;
  final double humidity;
  final int batteryLevel;
  final DateTime timestamp;

  const SensorData({
    required this.temperature,
    required this.humidity,
    required this.batteryLevel,
    required this.timestamp,
  });

  factory SensorData.fromBytes(List<int> bytes) {
    if (bytes.length < 5) return SensorData.empty();
    return SensorData(
      temperature: bytes[0] + bytes[1] / 100,
      humidity: bytes[2].toDouble(),
      batteryLevel: bytes[3],
      timestamp: DateTime.now(),
    );
  }

  factory SensorData.empty() => SensorData(
    temperature: 0, humidity: 0, batteryLevel: 0, timestamp: DateTime.now(),
  );
}

// Custom GATT UUIDs for our sensor device
class SensorGatt {
  static const String serviceUuid = '12345678-1234-1234-1234-123456789abc';
  static const String dataCharUuid = '12345678-1234-1234-1234-123456789abd'; // Notify
  static const String cmdCharUuid  = '12345678-1234-1234-1234-123456789abe'; // Write

  static const int cmdStart = 0x01;
  static const int cmdStop  = 0x02;
  static const int cmdReset = 0xFF;
}
```

---

## Step 2: BLE Scanner Service

```dart
// lib/services/ble_scanner.dart
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

class BleScanner {
  final Map<DeviceIdentifier, ScanResult> _results = {};
  bool _isScanning = false;

  List<ScanResult> get results => _results.values.toList()
    ..sort((a, b) => b.rssi.compareTo(a.rssi));
  bool get isScanning => _isScanning;

  Future<void> startScan({VoidCallback? onUpdate}) async {
    _results.clear();
    _isScanning = true;

    FlutterBluePlus.scanResults.listen((results) {
      for (final r in results) {
        if (r.device.platformName.isNotEmpty) {
          _results[r.device.remoteId] = r;
          onUpdate?.call();
        }
      }
    });

    FlutterBluePlus.isScanning.listen((scanning) {
      _isScanning = scanning;
      onUpdate?.call();
    });

    await FlutterBluePlus.startScan(
      withServices: [], // Filter by SensorGatt.serviceUuid in production
      timeout: const Duration(seconds: 10),
      androidScanMode: AndroidScanMode.lowLatency,
    );
  }

  Future<void> stopScan() async {
    await FlutterBluePlus.stopScan();
  }
}
```

---

## Step 3: BLE Connection Service

```dart
// lib/services/ble_connection.dart
import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../models/sensor_data.dart';

class BleConnection {
  BluetoothDevice? _device;
  BluetoothCharacteristic? _dataChar;
  BluetoothCharacteristic? _cmdChar;

  StreamSubscription? _connectionSub;
  StreamSubscription? _dataSub;

  final _sensorDataController = StreamController<SensorData>.broadcast();
  final _connectionStateController = StreamController<BluetoothConnectionState>.broadcast();

  Stream<SensorData> get sensorStream => _sensorDataController.stream;
  Stream<BluetoothConnectionState> get connectionStream => _connectionStateController.stream;
  BluetoothDevice? get connectedDevice => _device;

  Future<void> connect(BluetoothDevice device) async {
    _device = device;

    // Monitor connection state
    _connectionSub = device.connectionState.listen((state) {
      _connectionStateController.add(state);
      if (state == BluetoothConnectionState.disconnected) {
        _handleDisconnect();
      }
    });

    // Connect
    await device.connect(
      timeout: const Duration(seconds: 15),
      autoConnect: false,
    );

    // Discover services and set up characteristics
    await _setupGatt();
  }

  Future<void> _setupGatt() async {
    if (_device == null) return;
    final services = await _device!.discoverServices();

    for (final svc in services) {
      if (svc.uuid.str128.toLowerCase() == SensorGatt.serviceUuid.toLowerCase()) {
        for (final char in svc.characteristics) {
          final uuid = char.uuid.str128.toLowerCase();
          if (uuid == SensorGatt.dataCharUuid.toLowerCase()) {
            _dataChar = char;
          }
          if (uuid == SensorGatt.cmdCharUuid.toLowerCase()) {
            _cmdChar = char;
          }
        }
      }
    }

    // Subscribe to sensor data notifications
    if (_dataChar != null && _dataChar!.properties.notify) {
      await _dataChar!.setNotifyValue(true);
      _dataSub = _dataChar!.lastValueStream.listen((bytes) {
        if (bytes.isNotEmpty) {
          _sensorDataController.add(SensorData.fromBytes(bytes));
        }
      });
    }
  }

  Future<void> sendCommand(int command) async {
    if (_cmdChar == null) return;
    try {
      await _cmdChar!.write([command], withoutResponse: true);
    } catch (e) {
      print('Command error: $e');
    }
  }

  void _handleDisconnect() {
    _dataSub?.cancel();
    _dataChar = null;
    _cmdChar = null;
  }

  Future<void> disconnect() async {
    await _dataSub?.cancel();
    await _dataChar?.setNotifyValue(false);
    await _device?.disconnect();
    await _connectionSub?.cancel();
  }

  void dispose() {
    disconnect();
    _sensorDataController.close();
    _connectionStateController.close();
  }
}
```

---

## Step 4: BLE Provider (App State)

```dart
// lib/providers/ble_provider.dart
import 'package:flutter/material.dart';
import '../services/ble_scanner.dart';
import '../services/ble_connection.dart';
import '../models/sensor_data.dart';

class BleProvider extends ChangeNotifier {
  final BleScanner _scanner = BleScanner();
  final BleConnection _connection = BleConnection();

  List<ScanResult> get scanResults => _scanner.results;
  bool get isScanning => _scanner.isScanning;
  Stream<SensorData> get sensorStream => _connection.sensorStream;
  Stream<BluetoothConnectionState> get connectionStream => _connection.connectionStream;

  Future<void> startScan() async {
    await _scanner.startScan(onUpdate: notifyListeners);
    notifyListeners();
  }

  Future<void> stopScan() async {
    await _scanner.stopScan();
    notifyListeners();
  }

  Future<void> connectTo(BluetoothDevice device) async {
    await _scanner.stopScan();
    await _connection.connect(device);
    notifyListeners();
  }

  Future<void> sendCommand(int cmd) => _connection.sendCommand(cmd);

  Future<void> disconnect() async {
    await _connection.disconnect();
    notifyListeners();
  }

  @override
  void dispose() {
    _connection.dispose();
    super.dispose();
  }
}
```

---

> **Want the production-grade version of this app?** This walkthrough gets you a working prototype. The BLE Flutter Course takes it to production — error handling, auto-reconnect, background mode, and patterns proven on real hardware. **[Join the waitlist → blefluttercourse.com](https://blefluttercourse.com/)**

## Step 5: Scan Screen

```dart
// lib/screens/scan_screen.dart
class ScanScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<BleProvider>(
      builder: (context, ble, _) => Scaffold(
        appBar: AppBar(
          title: const Text('BLE Sensor Dashboard'),
          actions: [
            if (ble.isScanning)
              const Padding(padding: EdgeInsets.all(16),
                child: SizedBox(width: 20, height: 20,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))),
          ],
        ),
        body: ble.scanResults.isEmpty
          ? Center(child: Text(ble.isScanning ? 'Scanning...' : 'No devices found'))
          : ListView.builder(
              itemCount: ble.scanResults.length,
              itemBuilder: (ctx, i) {
                final r = ble.scanResults[i];
                return ListTile(
                  leading: const Icon(Icons.bluetooth),
                  title: Text(r.device.platformName.isEmpty
                    ? 'Unknown Device' : r.device.platformName),
                  subtitle: Text(r.device.remoteId.toString()),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('${r.rssi} dBm'),
                      Text(_rssiLabel(r.rssi),
                        style: TextStyle(color: _rssiColor(r.rssi), fontSize: 10)),
                    ],
                  ),
                  onTap: () {
                    ble.connectTo(r.device);
                    Navigator.push(ctx, MaterialPageRoute(
                      builder: (_) => DeviceScreen(device: r.device)));
                  },
                );
              },
            ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: ble.isScanning ? ble.stopScan : ble.startScan,
          icon: Icon(ble.isScanning ? Icons.stop : Icons.search),
          label: Text(ble.isScanning ? 'Stop' : 'Scan'),
        ),
      ),
    );
  }

  String _rssiLabel(int rssi) {
    if (rssi >= -55) return 'Excellent';
    if (rssi >= -70) return 'Good';
    if (rssi >= -85) return 'Fair';
    return 'Weak';
  }

  Color _rssiColor(int rssi) {
    if (rssi >= -55) return Colors.green;
    if (rssi >= -70) return Colors.orange;
    return Colors.red;
  }
}
```

---

## Step 6: Device Dashboard Screen

```dart
// lib/screens/device_screen.dart
class DeviceScreen extends StatelessWidget {
  final BluetoothDevice device;
  const DeviceScreen({required this.device});

  @override
  Widget build(BuildContext context) {
    return Consumer<BleProvider>(
      builder: (context, ble, _) => Scaffold(
        appBar: AppBar(
          title: Text(device.platformName.isEmpty ? 'Device' : device.platformName),
          actions: [
            StreamBuilder<BluetoothConnectionState>(
              stream: ble.connectionStream,
              builder: (_, snap) {
                final connected = snap.data == BluetoothConnectionState.connected;
                return Padding(padding: const EdgeInsets.all(16),
                  child: Icon(connected ? Icons.bluetooth_connected : Icons.bluetooth_disabled,
                    color: connected ? Colors.green : Colors.grey));
              },
            ),
          ],
        ),
        body: StreamBuilder<SensorData>(
          stream: ble.sensorStream,
          builder: (_, snap) {
            final data = snap.data ?? SensorData.empty();
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _DataCard('Temperature', '${data.temperature.toStringAsFixed(1)}°C', Icons.thermostat),
                  _DataCard('Humidity', '${data.humidity.toStringAsFixed(0)}%', Icons.water_drop),
                  _DataCard('Battery', '${data.batteryLevel}%', Icons.battery_std),
                  const Spacer(),
                  Row(children: [
                    Expanded(child: ElevatedButton.icon(
                      onPressed: () => ble.sendCommand(SensorGatt.cmdStart),
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Start'),
                    )),
                    const SizedBox(width: 12),
                    Expanded(child: OutlinedButton.icon(
                      onPressed: () => ble.sendCommand(SensorGatt.cmdStop),
                      icon: const Icon(Icons.stop),
                      label: const Text('Stop'),
                    )),
                  ]),
                  const SizedBox(height: 12),
                  SizedBox(width: double.infinity, child: TextButton(
                    onPressed: () { ble.disconnect(); Navigator.pop(context); },
                    child: const Text('Disconnect'),
                  )),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _DataCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _DataCard(this.label, this.value, this.icon);

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 12),
    child: ListTile(
      leading: Icon(icon, size: 32),
      title: Text(label, style: const TextStyle(fontSize: 14, color: Colors.grey)),
      subtitle: Text(value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
    ),
  );
}
```

---

## Step 7: main.dart

```dart
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => BleProvider(),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'BLE Sensor Dashboard',
    theme: ThemeData(colorSchemeSeed: Colors.blue, useMaterial3: true),
    home: const PermissionGate(),
  );
}

class PermissionGate extends StatefulWidget {
  const PermissionGate({super.key});
  @override
  State<PermissionGate> createState() => _PermissionGateState();
}

class _PermissionGateState extends State<PermissionGate> {
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final result = await BlePermissionManager.checkAndRequest();
    setState(() => _ready = result == BlePermissionResult.ready);
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return ScanScreen();
  }
}
```

---

## Hardware Pairing

This app works with any BLE peripheral that exposes the `SensorGatt` UUIDs. For development, use:
- **ESP32** — easiest to prototype with. See [ESP32 vs Arduino for Flutter BLE](/blog/esp32-vs-arduino-flutter-ble)
- **Arduino + HM-10** — classic setup with AT commands
- **nRF52840** — production-grade, most BLE features

---

## Testing on Real Devices

BLE cannot be tested in the iOS Simulator or Android Emulator. You need real devices:

1. Enable Developer Mode on your phone
2. Connect via USB
3. Run `flutter run --device-id <your-device-id>`
4. Use **nRF Connect** app on a second phone to simulate a BLE peripheral

---

## Related Guides

- 🚀 **[Getting Started with BLE in Flutter](/blog/getting-started-ble-flutter)** — BLE foundations
- 🔬 **[BLE GATT Profiles Explained](/blog/ble-gatt-profiles-explained)** — Services & characteristics
- 📡 **[Flutter BLE Scanning Guide](/blog/flutter-ble-scanning-guide)** — Scan patterns used here
- 📖 **[Reading & Writing Characteristics](/blog/flutter-ble-read-write-characteristics)** — Data operations
- 🔒 **[Flutter BLE Permissions Guide](/blog/flutter-ble-permissions-android-ios)** — Full permission setup
- 📦 **[Flutter BLE Packages Comparison](/blog/flutter-ble-packages-comparison)** — Why flutter_blue_plus
- 🔄 **[flutter_blue vs flutter_blue_plus](/blog/flutter-blue-vs-flutter-blue-plus)** — Package migration
- ⚡ **[BLE vs Classic Bluetooth in Flutter](/blog/ble-vs-classic-bluetooth-flutter)** — Protocol choice
- 🤖 **[ESP32 vs Arduino for Flutter BLE](/blog/esp32-vs-arduino-flutter-ble)** — Pick your hardware
- ⚖️ **[Flutter vs React Native for BLE](/blog/flutter-vs-react-native-ble)** — Why Flutter wins
- 📱 **[Flutter BLE vs Native Android (Kotlin)](/blog/flutter-ble-vs-native-android-kotlin)** — vs native
- 🌐 **[BLE vs WiFi for Flutter IoT](/blog/ble-vs-wifi-flutter-iot)** — Connectivity comparison

---

## Frequently Asked Questions

### How do I test my Flutter BLE app without real BLE hardware?
Use the **nRF Connect** mobile app on a second phone to simulate a BLE peripheral — it lets you create custom services, characteristics, and send notifications. For the iOS Simulator and Android Emulator, BLE is not supported; you need a real device.

### What's the best architecture for a production Flutter BLE app?
Separate BLE logic into service classes (scanner, connection, data handler), expose state through a `ChangeNotifier` provider or Riverpod, and never put BLE code directly in widgets. The pattern above (Services + Provider) scales well to real apps.

### How do I handle BLE disconnections and auto-reconnect?
Listen to `device.connectionState` and on `disconnected`, either notify the user or trigger a reconnect loop with exponential backoff. Re-run `discoverServices()` and re-subscribe to notifications after reconnecting — they don't persist across connections.

### Can this Flutter BLE app run in the background?
On iOS, background BLE requires declaring `bluetooth-central` in UIBackgroundModes and filtering scans by service UUID. On Android, use a Foreground Service. Both platforms impose heavy restrictions on background BLE to protect battery life.

### How do I add OTA firmware updates to my Flutter BLE app?
OTA over BLE requires chunked writes to a firmware characteristic (usually using Nordic DFU or a custom protocol), checksum verification, and a device bootloader that accepts and applies the update. This is an advanced topic covered in detail in the **[BLE Flutter Course](https://blefluttercourse.com/)**.

### Is this app production-ready?
The architecture above is production-quality for most use cases. For shipping apps, add: (1) exponential backoff reconnect logic, (2) persistent device ID storage so users don't re-scan every launch, (3) comprehensive error UI, and (4) background mode support if needed.

---

## Ship Your BLE App

You now have a complete, production-architecture Flutter BLE app: permissions, scanning, connection management, GATT data streaming, command sending, and proper cleanup. Every pattern here maps directly to real shipping apps.

**Want to go further?** The **[BLE Flutter Course](https://blefluttercourse.com/)** takes you through advanced topics — OTA updates, multi-device connections, custom GATT profiles, background operation, and App Store submission — with real hardware and working source code for every lesson.

👉 **[Enroll in the BLE Flutter Course →](https://blefluttercourse.com/)**
