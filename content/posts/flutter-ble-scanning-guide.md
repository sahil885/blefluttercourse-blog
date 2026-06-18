---
title: "Flutter BLE Scanning: Discover & Filter Devices with flutter_blue_plus [2026 Guide]"
date: "2026-03-28"
excerpt: "Master BLE device scanning in Flutter. Learn to scan, filter by name/UUID/RSSI, handle permissions, manage battery drain, and implement robust scanning UI patterns with flutter_blue_plus."
tags: ["Flutter", "BLE", "scanning", "flutter_blue_plus", "Bluetooth"]
faqs:
  - question: "How do I scan for BLE devices in Flutter?"
    answer: "Use FlutterBluePlus.startScan() with an optional timeout. Listen to FlutterBluePlus.onScanResults stream to receive ScanResult objects containing device name, RSSI, advertisement data, and services. Always call FlutterBluePlus.stopScan() when done. Ensure Bluetooth permissions are granted first."
  - question: "How do I filter BLE scan results in Flutter?"
    answer: "Pass withServices: [Guid(YOUR_UUID)] to startScan() to filter by service UUID — the most reliable filter. You can also filter in your stream listener by device name, RSSI threshold, or manufacturer data. Service UUID filtering is required on iOS for background scanning."
  - question: "Why does Flutter BLE scanning drain the battery?"
    answer: "Continuous scanning keeps the radio active. Use a timeout on startScan(), use androidScanMode: AndroidScanMode.lowPower for non-critical scanning, and stop scanning as soon as you find your target device. On iOS, Core Bluetooth automatically manages scan duty cycling."
  - question: "How long should I scan for BLE devices in Flutter?"
    answer: "For a typical connect-on-demand flow, 10–15 seconds with a timeout is sufficient. For passive background monitoring, use scan windows with gaps. Always stop scanning before connecting to a device — scanning and connecting simultaneously can cause instability on some Android devices."
---

> **TL;DR:** BLE scanning in Flutter uses `FlutterBluePlus.startScan()` and `FlutterBluePlus.scanResults` stream. Always filter by service UUID or device name to avoid noise, stop scanning before connecting, handle Android/iOS permission differences, and implement a scan timeout. This guide covers every scanning pattern you'll need in production.

# Flutter BLE Scanning Guide: Discover & Filter BLE Devices with flutter_blue_plus

Before you can read sensor data, send commands, or build any BLE feature, you need to find the device. BLE scanning sounds simple, but there are dozens of edge cases: permissions on Android 12+, background scanning limitations on iOS, battery drain from continuous scanning, duplicate results flooding your UI, and connecting at the right moment. This guide covers all of it.

---

> **Free guide:** Struggling with dropped connections? Grab *The 7 BLE Mistakes That Make Flutter Apps Disconnect* — production-ready fixes you can apply today. [**Download the free guide →**](https://blog.blefluttercourse.com/free-guide)

## Prerequisites

Make sure you've:
1. Added flutter_blue_plus to your `pubspec.yaml` (see [Flutter BLE packages comparison](/blog/flutter-ble-packages-comparison))
2. Configured Bluetooth permissions for [Android & iOS](/blog/flutter-ble-permissions-android-ios)
3. Understood the [BLE fundamentals](/blog/getting-started-ble-flutter)

---

## Basic Scanning

```dart
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

// Check if Bluetooth is available and on
BluetoothAdapterState state = await FlutterBluePlus.adapterState.first;
if (state != BluetoothAdapterState.on) {
  print('Bluetooth is off');
  return;
}

// Start scanning (10 second timeout)
await FlutterBluePlus.startScan(timeout: const Duration(seconds: 10));

// Listen for scan results
FlutterBluePlus.scanResults.listen((results) {
  for (ScanResult r in results) {
    print('${r.device.platformName}: RSSI ${r.rssi}');
    print('Device ID: ${r.device.remoteId}');
  }
});

// Stop scanning manually
await FlutterBluePlus.stopScan();
```

---

## Understanding ScanResult

Each `ScanResult` contains:

```dart
FlutterBluePlus.scanResults.listen((results) {
  for (ScanResult r in results) {
    // The device object for connecting
    BluetoothDevice device = r.device;
    
    // Signal strength (-40 = excellent, -80 = weak)
    int rssi = r.rssi;
    
    // Advertising data from the peripheral
    AdvertisementData adData = r.advertisementData;
    
    // Device name from advertisement (may differ from bonded name)
    String? localName = adData.localName;
    
    // Service UUIDs the device advertises
    List<String> serviceUuids = adData.serviceUuids;
    
    // Manufacturer data (company-specific)
    Map<int, List<int>> manufacturerData = adData.manufacturerData;
    
    // TX power level (for distance estimation)
    int? txPower = adData.txPowerLevel;
    
    // Whether the device appears for the first time this scan
    bool isNew = !seenDevices.contains(device.remoteId);
  }
});
```

---

## Filtering Scan Results

### Filter by Service UUID (Most Reliable)

The most reliable way to find your device is to filter by the service UUID your device advertises. This works even if the device name is blank:

```dart
const String TARGET_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';

await FlutterBluePlus.startScan(
  withServices: [Guid(TARGET_SERVICE_UUID)],
  timeout: const Duration(seconds: 15),
);

FlutterBluePlus.scanResults.listen((results) {
  // Only devices advertising our service UUID appear here
  for (ScanResult r in results) {
    print('Found our device: ${r.device.platformName}');
  }
});
```

### Filter by Device Name

```dart
FlutterBluePlus.scanResults.listen((results) {
  for (ScanResult r in results) {
    if (r.device.platformName.contains('MySensor')) {
      print('Found target device!');
    }
  }
});
```

### Filter by RSSI (Signal Strength)

Use RSSI filtering to show only nearby devices:

```dart
const int MIN_RSSI = -70; // Only show devices within ~5 meters

FlutterBluePlus.scanResults.listen((results) {
  final nearbyDevices = results.where((r) => r.rssi >= MIN_RSSI).toList();
  
  // Sort by signal strength (closest first)
  nearbyDevices.sort((a, b) => b.rssi.compareTo(a.rssi));
  
  for (ScanResult r in nearbyDevices) {
    print('${r.device.platformName}: ${r.rssi} dBm');
  }
});
```

---

## Avoiding Duplicate Results

By default, `scanResults` emits a new list every time any device updates. Use `removeDuplicates` or manage state manually:

```dart
// Using withKeywords to avoid duplicates by device ID
final Map<DeviceIdentifier, ScanResult> _seen = {};

FlutterBluePlus.scanResults.listen((results) {
  for (ScanResult r in results) {
    _seen[r.device.remoteId] = r; // Overwrites with latest RSSI
  }
  
  // Now _seen.values contains deduplicated, up-to-date results
  final uniqueDevices = _seen.values.toList();
  setState(() => _devices = uniqueDevices);
});
```

---

## Scan Parameters Deep Dive

```dart
await FlutterBluePlus.startScan(
  // Only find devices advertising these service UUIDs
  withServices: [Guid('180D')], // Heart Rate Service
  
  // Only find devices with these names (Android only)
  withNames: ['MySensor', 'MyDevice'],
  
  // Scan timeout — always set this!
  timeout: const Duration(seconds: 15),
  
  // Remove duplicates from stream (convenience option)
  // Note: set to false if you want RSSI updates
  androidScanMode: AndroidScanMode.lowLatency, // or .lowPower for background
  
  // Continue scan after first result (true = stop after finding one device)
  oneByOne: false,
);
```

### Android Scan Modes

| Mode | Use Case | Battery Impact |
|------|---------|---------------|
| `lowLatency` | Active scanning in foreground | High |
| `balanced` | Default — good for most cases | Medium |
| `lowPower` | Background or long-running scans | Low |
| `opportunistic` | Passive — only sees results from other apps | Negligible |

---

## Managing Scan State in Flutter

Here's a production-ready scan state pattern:

```dart
class BleScannerProvider extends ChangeNotifier {
  final Map<DeviceIdentifier, ScanResult> _results = {};
  bool _isScanning = false;
  StreamSubscription? _scanSubscription;
  StreamSubscription? _isScanningSubscription;

  List<ScanResult> get devices => _results.values.toList()
    ..sort((a, b) => b.rssi.compareTo(a.rssi));
  bool get isScanning => _isScanning;

  BleScannerProvider() {
    _isScanningSubscription = FlutterBluePlus.isScanning.listen((scanning) {
      _isScanning = scanning;
      notifyListeners();
    });
  }

  Future<void> startScan() async {
    _results.clear();
    notifyListeners();

    _scanSubscription = FlutterBluePlus.scanResults.listen((results) {
      for (final r in results) {
        if (r.device.platformName.isNotEmpty) {
          _results[r.device.remoteId] = r;
        }
      }
      notifyListeners();
    });

    await FlutterBluePlus.startScan(
      timeout: const Duration(seconds: 10),
      androidScanMode: AndroidScanMode.lowLatency,
    );
  }

  Future<void> stopScan() async {
    await FlutterBluePlus.stopScan();
    await _scanSubscription?.cancel();
  }

  @override
  void dispose() {
    stopScan();
    _isScanningSubscription?.cancel();
    super.dispose();
  }
}
```

---

## Scanning UI Pattern

```dart
class ScanPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => BleScannerProvider(),
      child: Consumer<BleScannerProvider>(
        builder: (context, scanner, _) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Find BLE Devices'),
              actions: [
                if (scanner.isScanning)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    ),
                  ),
              ],
            ),
            body: ListView.builder(
              itemCount: scanner.devices.length,
              itemBuilder: (context, index) {
                final result = scanner.devices[index];
                return ListTile(
                  title: Text(result.device.platformName.isEmpty 
                    ? 'Unknown Device' 
                    : result.device.platformName),
                  subtitle: Text(result.device.remoteId.toString()),
                  trailing: Text('${result.rssi} dBm'),
                  onTap: () => _connectToDevice(context, result.device),
                );
              },
            ),
            floatingActionButton: FloatingActionButton.extended(
              onPressed: scanner.isScanning 
                ? scanner.stopScan 
                : scanner.startScan,
              label: Text(scanner.isScanning ? 'Stop' : 'Scan'),
              icon: Icon(scanner.isScanning ? Icons.stop : Icons.search),
            ),
          );
        },
      ),
    );
  }
}
```

---

## iOS-Specific Scanning Considerations

iOS has strict background scanning limitations:

1. **App must be in foreground** for full scanning — use Core Location for background
2. **Service UUID filter required** for background scanning — without it iOS won't deliver results
3. **Device names may be cached** — iOS caches names from previous connections, not always from advertisement
4. **State preservation/restoration** — needed for background scanning approval

```dart
// iOS: Always use service UUID filter for consistent results
await FlutterBluePlus.startScan(
  withServices: [Guid(YOUR_SERVICE_UUID)], // Required for iOS background
  timeout: const Duration(seconds: 30),
);
```

---

## Android 12+ Scanning Permissions

On Android 12+, scanning requires `BLUETOOTH_SCAN` permission. See the [complete Android & iOS permissions guide](/blog/flutter-ble-permissions-android-ios) for the full setup.

```dart
// Check and request permissions before scanning
Future<bool> checkPermissions() async {
  if (Platform.isAndroid) {
    Map<Permission, PermissionStatus> statuses = await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.location,
    ].request();
    
    return statuses.values.every((s) => s.isGranted);
  } else if (Platform.isIOS) {
    // iOS permissions handled via Info.plist + system dialog
    return true;
  }
  return false;
}
```

---

## Battery-Efficient Scanning

Continuous scanning kills battery. Use these patterns:

```dart
// Pattern 1: Scan for fixed duration
await FlutterBluePlus.startScan(timeout: const Duration(seconds: 10));
// Auto-stops after 10 seconds

// Pattern 2: Stop immediately when target found
late StreamSubscription _sub;
_sub = FlutterBluePlus.scanResults.listen((results) async {
  for (final r in results) {
    if (r.device.platformName == 'MyDevice') {
      await FlutterBluePlus.stopScan();
      await _sub.cancel();
      connectToDevice(r.device);
      break;
    }
  }
});

// Pattern 3: Low-power mode for long searches  
await FlutterBluePlus.startScan(
  androidScanMode: AndroidScanMode.lowPower,
  timeout: const Duration(minutes: 1),
);
```

---

## Connecting After Scanning

Always stop scanning before connecting — scanning consumes radio resources needed for connection:

```dart
Future<void> connectToDevice(BluetoothDevice device) async {
  // Step 1: Stop scanning
  await FlutterBluePlus.stopScan();
  
  // Step 2: Connect
  await device.connect(
    timeout: const Duration(seconds: 15),
    autoConnect: false,
  );
  
  // Step 3: Discover services
  List<BluetoothService> services = await device.discoverServices();
  
  // Step 4: Start interacting with GATT
  // See: /blog/ble-gatt-profiles-explained
}
```

---

## Related Guides

- 🚀 **[Getting Started with BLE in Flutter](/blog/getting-started-ble-flutter)** — BLE foundations
- 🔬 **[BLE GATT Profiles Explained](/blog/ble-gatt-profiles-explained)** — What to do after scanning
- 📖 **[Reading & Writing BLE Characteristics](/blog/flutter-ble-read-write-characteristics)** — Data operations
- 🔒 **[Flutter BLE Permissions: Android & iOS](/blog/flutter-ble-permissions-android-ios)** — Permission setup
- 🏗️ **[Build a Complete Flutter BLE App](/blog/build-complete-flutter-ble-app)** — End-to-end project
- 📦 **[Flutter BLE Packages Comparison](/blog/flutter-ble-packages-comparison)** — Package choices
- 🔄 **[flutter_blue vs flutter_blue_plus](/blog/flutter-blue-vs-flutter-blue-plus)** — Which package?
- ⚡ **[BLE vs Classic Bluetooth in Flutter](/blog/ble-vs-classic-bluetooth-flutter)** — Protocol differences
- 🤖 **[ESP32 vs Arduino for Flutter BLE](/blog/esp32-vs-arduino-flutter-ble)** — Hardware to scan for
- ⚖️ **[Flutter vs React Native for BLE](/blog/flutter-vs-react-native-ble)** — Framework comparison
- 📱 **[Flutter BLE vs Native Android](/blog/flutter-ble-vs-native-android-kotlin)** — Flutter vs Kotlin scanning
- 🌐 **[BLE vs WiFi for Flutter IoT](/blog/ble-vs-wifi-flutter-iot)** — Connectivity comparison

---

## Frequently Asked Questions

### Why does my Flutter BLE scan return no results?
Common causes: (1) Bluetooth permissions not granted — check Android 12+ `BLUETOOTH_SCAN` permission, (2) Bluetooth adapter is off, (3) filtering by a service UUID the device doesn't advertise, (4) on iOS, device name may not appear until after first connection. Always check `FlutterBluePlus.adapterState` first.

### How do I scan for BLE devices in the background on Flutter?
Background scanning is platform-limited. On iOS, you must use service UUID filtering and register for Core Bluetooth state restoration. On Android, use a Foreground Service with `androidScanMode: AndroidScanMode.lowPower`. flutter_blue_plus alone doesn't handle background scanning — you need platform channel code.

### Why does BLE scanning drain battery so fast?
The BLE radio actively listens on all advertising channels (37, 38, 39) during a scan. Always set a timeout, use low-power scan mode when possible, and stop scanning the moment you've found your device. Avoid continuous/infinite scans.

### Can I scan for specific BLE device names in Flutter?
Yes. On Android, you can use the `withNames` parameter in `startScan()`. On iOS, device names are not always in the advertisement packet — you may need to connect first to get the full name. Filter by service UUID on iOS for reliability.

### How do I show signal strength (distance) in my Flutter BLE scan UI?
Use the `r.rssi` value from `ScanResult`. RSSI of -40 to -55 dBm is very close (< 1m), -55 to -70 dBm is close (1–5m), -70 to -85 dBm is moderate (5–15m), below -85 dBm is far. Exact distance calculation requires knowing the TX power level.

### What's the fastest way to learn BLE scanning and beyond?
The **[BLE Flutter Course](https://blefluttercourse.com/)** walks you through every BLE scanning pattern shown in this article, plus connecting, GATT, notifications, and building complete projects with real hardware.

---

## Summary

BLE scanning in Flutter is straightforward with flutter_blue_plus, but production apps need careful attention to permissions, filtering, battery management, and iOS quirks. The patterns above handle all the edge cases you'll encounter.

**Ready for the next step?** Now that you can find and connect to devices, learn how to [read and write BLE characteristics](/blog/flutter-ble-read-write-characteristics) and interact with [GATT services](/blog/ble-gatt-profiles-explained).

Or dive into the **[BLE Flutter Course](https://blefluttercourse.com/)** for structured learning with real hardware projects.

👉 **[Enroll in the BLE Flutter Course →](https://blefluttercourse.com/)**
