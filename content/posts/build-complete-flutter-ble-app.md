---
title: "Build a Complete Flutter BLE App from Scratch (2026 Full Tutorial)"
date: "2025-06-01"
excerpt: "Step-by-step tutorial to build a full Flutter BLE app from scratch. Covers scanning, connecting, reading live sensor data, and writing commands using flutter_blue_plus. The complete beginner-to-working-app guide."
tags: ["Full Project", "flutter_blue_plus", "Tutorial", "Beginner"]
---

# Build a Complete Flutter BLE App from Scratch (2026)

This is the tutorial I wish existed when I started with Flutter BLE. Not another "scan for devices" demo that stops there — a real, complete app that scans, connects, reads live sensor data via notifications, writes commands, and handles disconnections gracefully.

By the end you'll have a working Flutter BLE app with clean architecture you can adapt for any hardware: Arduino, ESP32, fitness trackers, smart home devices, or medical sensors.

## What We're Building

A Flutter BLE app with four screens:

- **Scan screen** — discover nearby BLE devices, sorted by signal strength
- **Device screen** — connect with a loading state
- **Sensor screen** — live temperature data via notifications + battery level
- **Control** — write commands to toggle an LED on the peripheral

This covers all the core BLE patterns you'll use in any real project.

## Project Setup

```bash
flutter create ble_demo_app
cd ble_demo_app
```

Update `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_blue_plus: ^1.32.0
  permission_handler: ^11.3.0
```

Run `flutter pub get`.

## Platform Permissions

### Android — AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
    android:maxSdkVersion="30" />
```

And in `android/app/build.gradle`:
```groovy
compileSdkVersion 34
targetSdkVersion 34
minSdkVersion 21
```

### iOS — Info.plist

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to connect to sensors and read live data.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app uses Bluetooth to connect to sensors and read live data.</string>
```

## Project Structure

```
lib/
├── main.dart
├── services/
│   └── ble_service.dart
└── screens/
    ├── scan_screen.dart
    ├── device_screen.dart
    └── sensor_screen.dart
```

## Step 1: The BLE Service

Create `lib/services/ble_service.dart`. This is the heart of the app — it handles all BLE logic, keeping screens clean and focused on UI:

```dart
import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

class BleService {
  // Replace with your device's actual UUIDs
  static final _serviceUuid = Guid('12345678-1234-1234-1234-123456789012');
  static final _tempCharUuid = Guid('12345678-1234-1234-1234-123456789013');
  static final _ledCharUuid  = Guid('12345678-1234-1234-1234-123456789014');
  static final _battCharUuid = Guid('0000180f-0000-1000-8000-00805f9b34fb');

  BluetoothDevice? _device;
  BluetoothCharacteristic? _ledChar;
  StreamSubscription<List<int>>? _tempSubscription;

  final _connectionState = StreamController<BluetoothConnectionState>.broadcast();
  final _temperature = StreamController<double>.broadcast();
  final _battery = StreamController<int>.broadcast();

  Stream<BluetoothConnectionState> get connectionState => _connectionState.stream;
  Stream<double> get temperature => _temperature.stream;
  Stream<int> get battery => _battery.stream;
  bool get isConnected => _device != null;

  Future<void> connect(BluetoothDevice device) async {
    _device = device;

    // Track connection state changes
    device.connectionState.listen((state) {
      _connectionState.add(state);
      if (state == BluetoothConnectionState.disconnected) {
        _cleanup();
      }
    });

    await device.connect(timeout: const Duration(seconds: 15));
    await _discoverAndSetup(device);
  }

  Future<void> _discoverAndSetup(BluetoothDevice device) async {
    final services = await device.discoverServices();

    for (final service in services) {
      for (final char in service.characteristics) {
        final uuid = char.characteristicUuid;

        if (uuid == _tempCharUuid && char.properties.notify) {
          await char.setNotifyValue(true);
          _tempSubscription = char.lastValueStream.listen((data) {
            if (data.length >= 2) {
              final raw = (data[1] << 8) | data[0];
              _temperature.add(raw / 100.0);
            }
          });
        }

        if (uuid == _ledCharUuid) {
          _ledChar = char;
        }

        if (uuid == _battCharUuid && char.properties.read) {
          final value = await char.read();
          if (value.isNotEmpty) _battery.add(value[0]);
        }
      }
    }
  }

  Future<void> setLed(bool on) async {
    await _ledChar?.write([on ? 0x01 : 0x00]);
  }

  Future<void> disconnect() async {
    await _device?.disconnect();
    _cleanup();
  }

  void _cleanup() {
    _tempSubscription?.cancel();
    _ledChar = null;
    _device = null;
  }

  void dispose() {
    _connectionState.close();
    _temperature.close();
    _battery.close();
  }
}
```

## Step 2: Scan Screen

`lib/screens/scan_screen.dart`:

```dart
import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'device_screen.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final Map<DeviceIdentifier, ScanResult> _results = {};
  bool _isScanning = false;
  StreamSubscription<List<ScanResult>>? _sub;

  @override
  void initState() {
    super.initState();
    _requestPermissions();
  }

  @override
  void dispose() {
    _sub?.cancel();
    FlutterBluePlus.stopScan();
    super.dispose();
  }

  Future<void> _requestPermissions() async {
    if (Platform.isAndroid) {
      await [Permission.bluetoothScan, Permission.bluetoothConnect].request();
    }
  }

  Future<void> _startScan() async {
    setState(() { _results.clear(); _isScanning = true; });

    _sub = FlutterBluePlus.scanResults.listen((results) {
      setState(() {
        for (final r in results) _results[r.device.remoteId] = r;
      });
    });

    await FlutterBluePlus.startScan(timeout: const Duration(seconds: 15));
    setState(() => _isScanning = false);
  }

  Color _rssiColor(int rssi) {
    if (rssi > -60) return Colors.green;
    if (rssi > -80) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final devices = _results.values.toList()
      ..sort((a, b) => b.rssi.compareTo(a.rssi));

    return Scaffold(
      appBar: AppBar(
        title: const Text('BLE Scanner'),
        backgroundColor: Colors.blue.shade900,
        foregroundColor: Colors.white,
        actions: [
          if (_isScanning)
            const Padding(
              padding: EdgeInsets.all(12),
              child: SizedBox(
                width: 20, height: 20,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
              ),
            ),
          IconButton(
            icon: Icon(_isScanning ? Icons.stop : Icons.search),
            onPressed: _isScanning ? FlutterBluePlus.stopScan : _startScan,
          ),
        ],
      ),
      body: devices.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.bluetooth_searching, size: 80, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    _isScanning ? 'Scanning...' : 'Tap search to find BLE devices',
                    style: const TextStyle(color: Colors.grey, fontSize: 16),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: devices.length,
              itemBuilder: (_, i) {
                final r = devices[i];
                final name = r.device.platformName.isEmpty
                    ? 'Unknown Device'
                    : r.device.platformName;
                return ListTile(
                  leading: const Icon(Icons.bluetooth, color: Colors.blue),
                  title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(r.device.remoteId.toString()),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _rssiColor(r.rssi),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text('${r.rssi} dBm',
                        style: const TextStyle(color: Colors.white, fontSize: 12)),
                  ),
                  onTap: () {
                    FlutterBluePlus.stopScan();
                    Navigator.push(context, MaterialPageRoute(
                      builder: (_) => DeviceScreen(device: r.device),
                    ));
                  },
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _isScanning ? null : _startScan,
        backgroundColor: Colors.blue.shade900,
        child: const Icon(Icons.bluetooth_searching, color: Colors.white),
      ),
    );
  }
}
```

## Step 3: Device Screen

`lib/screens/device_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../services/ble_service.dart';
import 'sensor_screen.dart';

class DeviceScreen extends StatefulWidget {
  final BluetoothDevice device;
  const DeviceScreen({super.key, required this.device});

  @override
  State<DeviceScreen> createState() => _DeviceScreenState();
}

class _DeviceScreenState extends State<DeviceScreen> {
  final _ble = BleService();
  bool _connecting = false;
  String _status = 'Ready to connect';

  Future<void> _connect() async {
    setState(() { _connecting = true; _status = 'Connecting...'; });
    try {
      await _ble.connect(widget.device);
      if (mounted) {
        Navigator.pushReplacement(context, MaterialPageRoute(
          builder: (_) => SensorScreen(bleService: _ble),
        ));
      }
    } catch (e) {
      setState(() { _connecting = false; _status = 'Failed: ${e.toString()}'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.device.platformName.isEmpty
          ? 'Unknown Device' : widget.device.platformName)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.bluetooth, size: 80, color: Colors.blue),
              const SizedBox(height: 24),
              Text(
                widget.device.platformName.isEmpty
                    ? 'Unknown Device' : widget.device.platformName,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              Text(widget.device.remoteId.toString(),
                  style: const TextStyle(color: Colors.grey)),
              const SizedBox(height: 40),
              if (_connecting)
                const CircularProgressIndicator()
              else
                FilledButton.icon(
                  onPressed: _connect,
                  icon: const Icon(Icons.link),
                  label: const Text('Connect'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                  ),
                ),
              const SizedBox(height: 16),
              Text(_status, style: const TextStyle(color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Step 4: Sensor Screen

`lib/screens/sensor_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../services/ble_service.dart';

class SensorScreen extends StatefulWidget {
  final BleService bleService;
  const SensorScreen({super.key, required this.bleService});

  @override
  State<SensorScreen> createState() => _SensorScreenState();
}

class _SensorScreenState extends State<SensorScreen> {
  double _temp = 0;
  int _battery = 0;
  bool _ledOn = false;
  bool _connected = true;

  @override
  void initState() {
    super.initState();
    widget.bleService.temperature.listen((t) {
      if (mounted) setState(() => _temp = t);
    });
    widget.bleService.battery.listen((b) {
      if (mounted) setState(() => _battery = b);
    });
    widget.bleService.connectionState.listen((state) {
      if (mounted) setState(() => _connected =
          state == BluetoothConnectionState.connected);
    });
  }

  @override
  void dispose() {
    widget.bleService.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Sensor Data'),
        actions: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: Chip(
              avatar: Icon(Icons.circle, size: 10,
                  color: _connected ? Colors.green : Colors.red),
              label: Text(_connected ? 'Connected' : 'Disconnected',
                  style: const TextStyle(fontSize: 12)),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Temperature card
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    const Icon(Icons.thermostat, size: 48, color: Colors.orange),
                    const SizedBox(height: 8),
                    const Text('Temperature',
                        style: TextStyle(fontSize: 16, color: Colors.grey)),
                    const SizedBox(height: 8),
                    Text(
                      '${_temp.toStringAsFixed(1)}°C',
                      style: const TextStyle(fontSize: 56, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Battery
            Card(
              child: ListTile(
                leading: Icon(
                  _battery > 20 ? Icons.battery_full : Icons.battery_alert,
                  color: _battery > 20 ? Colors.green : Colors.red,
                  size: 32,
                ),
                title: const Text('Battery Level'),
                trailing: Text('$_battery%',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 16),

            // LED control
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    Icon(Icons.lightbulb,
                        color: _ledOn ? Colors.amber : Colors.grey, size: 32),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text('LED Control',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                    ),
                    Switch(
                      value: _ledOn,
                      onChanged: _connected ? (v) async {
                        setState(() => _ledOn = v);
                        await widget.bleService.setLed(v);
                      } : null,
                    ),
                  ],
                ),
              ),
            ),

            if (!_connected)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Device disconnected',
                    style: TextStyle(color: Colors.red)),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Step 5: main.dart

```dart
import 'package:flutter/material.dart';
import 'screens/scan_screen.dart';

void main() => runApp(const BleApp());

class BleApp extends StatelessWidget {
  const BleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter BLE Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const ScanScreen(),
    );
  }
}
```

## Running the App

```bash
# Android
flutter run --release

# iOS (must use a real device — simulator has no Bluetooth)
flutter run --release -d <your-device-id>
```

## Testing Without Hardware

No BLE device yet? Use these free tools to simulate a peripheral:

- **nRF Connect** (iOS/Android) — configure it as a BLE peripheral with custom services and characteristics
- **LightBlue** (iOS/macOS) — simulate sensors with custom data
- **ESP32 + Arduino** — cheap hardware (~$5) to build your own peripheral

## What You've Built

You now have a complete Flutter BLE app with:
- ✅ Clean service/screen architecture
- ✅ Android 12+ and iOS permissions
- ✅ Real-time sensor data via BLE notifications
- ✅ Writing commands to the peripheral (LED control)
- ✅ Connection state management with auto-cleanup

## What's Missing for Production

This tutorial covers the core patterns, but shipping a real app needs more:

- **Auto-reconnection** — retry logic when connection drops unexpectedly
- **Background BLE** — maintain connections when app is backgrounded
- **Bonding and pairing** — secure encrypted connections
- **OTA firmware updates** — DFU over BLE
- **Multiple simultaneous connections** — managing several devices at once
- **Large data transfer** — splitting payloads across multiple write operations

The [BLE Flutter Course](https://blefluttercourse.com) covers every one of these production topics with full source code, real hardware examples, and video walkthroughs — taking you from this foundation all the way to shipping a polished, production-ready BLE app.
