---
title: "flutter_blue_plus to universal_ble: Migration Guide (2026)"
date: "2026-10-10"
excerpt: "Move your Flutter app from flutter_blue_plus to the free, BSD-licensed universal_ble, with an API mapping table and side-by-side code for every BLE step."
tags: ["universal_ble", "flutter_blue_plus", "Migration", "Packages"]
faqs:
  - question: "Is universal_ble free for commercial use?"
    answer: "Yes. universal_ble is released under the BSD-3-Clause licence, which allows commercial use with no licence fee. It's published by Navideck and supports Android, iOS, macOS, Windows, Linux and Web."
  - question: "Can universal_ble replace flutter_blue_plus in an existing app?"
    answer: "Yes, for apps that connect to BLE devices. It covers scanning, connecting, service discovery, reads, writes, notifications, indications, MTU requests and pairing. The API is different, so every place your app calls flutter_blue_plus changes: device IDs and UUIDs are plain strings, scan results arrive one device at a time, and you choose notifications or indications explicitly."
  - question: "Can I keep the flutter_blue_plus API without paying for a licence?"
    answer: "Yes. You can pin flutter_blue_plus 1.36.8, the last BSD-3-Clause release, which gets no further fixes. Or you can switch to flutter_blue_ultra or bluebird, two BSD-3-Clause packages that keep flutter_blue_plus's API shape. Both are young projects with small user bases."
---

> **TL;DR:** flutter_blue_plus has needed a paid licence for commercial use since version 2.0. **universal_ble** is a free, BSD-3-Clause alternative that runs on Android, iOS, macOS, Windows, Linux and Web. Migrating means swapping the dependency, then rewriting each BLE call: scan with `UniversalBle.startScan()` and `scanStream`, connect with `bleDevice.connect()`, find characteristics with `getCharacteristic()`, and subscribe with `notifications.subscribe()`. The table below maps every call.

# How to Migrate from flutter_blue_plus to universal_ble

Since version 2.0, `flutter_blue_plus` needs a paid licence for any for-profit use, from $999 for an individual to $49,999 for a company with 1,000+ employees. Our [flutter_blue_plus licence guide](/blog/flutter-blue-vs-flutter-blue-plus) has the full breakdown. For many commercial apps, moving to a free package costs less than the licence.

`universal_ble` is the closest free replacement. It's published by Navideck under the BSD-3-Clause licence, covers every Flutter platform, and is actively maintained: version 2.3.0 shipped in September 2026, and it was downloaded about 74,000 times in the 30 days to 10 October 2026.

This guide maps each flutter_blue_plus call to its universal_ble equivalent, with side-by-side code for scanning, connecting, reading, writing and notifications. The code targets flutter_blue_plus 2.3 and universal_ble 2.3.

---

## Step 1: Swap the Dependency

```yaml
# pubspec.yaml
dependencies:
  # flutter_blue_plus: ^2.3.14
  universal_ble: ^2.3.0
```

```dart
// Before
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

// After
import 'package:universal_ble/universal_ble.dart';
```

Your platform setup mostly carries over. universal_ble needs the same Android Bluetooth permissions in `AndroidManifest.xml`: `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` on Android 12+, plus the legacy Bluetooth and location permissions for older versions. On iOS, keep `NSBluetoothAlwaysUsageDescription` in `Info.plist`. universal_ble's setup guide also lists `NSBluetoothPeripheralUsageDescription`, so add it if you don't have it. Our [Flutter BLE permissions guide](/blog/flutter-ble-permissions-android-ios) covers both platforms.

---

## The API at a Glance

| Task | flutter_blue_plus | universal_ble |
|---|---|---|
| Bluetooth on/off state | `FlutterBluePlus.adapterState` | `UniversalBle.availabilityStream` |
| Request permissions | Your own code, e.g. permission_handler | `UniversalBle.requestPermissions()` |
| Start a scan | `FlutterBluePlus.startScan(withServices: [...])` | `UniversalBle.startScan(scanFilter: ScanFilter(...))` |
| Scan results | `FlutterBluePlus.onScanResults` (a list) | `UniversalBle.scanStream` (one device per event) |
| Stop scanning | `FlutterBluePlus.stopScan()` | `UniversalBle.stopScan()` |
| Device ID | `device.remoteId` | `bleDevice.deviceId` (a `String`) |
| Connect | `device.connect(license: ...)` | `bleDevice.connect()` |
| Connection state | `device.connectionState` | `bleDevice.connectionStream` (a `bool`) |
| Discover services | `device.discoverServices()` | `bleDevice.discoverServices()` |
| Find a characteristic | Search the discovered services | `bleDevice.getCharacteristic('2a37', service: '180d')` |
| Read | `characteristic.read()` | `characteristic.read()` |
| Write | `characteristic.write(value)` | `characteristic.write(value)` |
| Write without response | `write(value, withoutResponse: true)` | `write(value, withResponse: false)` |
| Notifications | `setNotifyValue(true)` | `notifications.subscribe()` |
| Indications | `setNotifyValue(true)`, or `forceIndications` on Android | `indications.subscribe()` |
| Incoming values | `characteristic.onValueReceived` | `characteristic.onValueReceived` |
| Stop notifications | `setNotifyValue(false)` | `characteristic.unsubscribe()` |
| Request MTU | `device.requestMtu(512)` | `bleDevice.requestMtu(512)` |
| Pair / bond | `device.createBond()` | `bleDevice.pair()` |
| Disconnect | `device.disconnect()` | `bleDevice.disconnect()` |
| Already-connected devices | `FlutterBluePlus.systemDevices([...])` | `UniversalBle.getSystemDevices()` |

---

## Step 2: Check Bluetooth State and Permissions

**flutter_blue_plus:**

```dart
// Wait until Bluetooth is on
await FlutterBluePlus.adapterState
    .where((state) => state == BluetoothAdapterState.on)
    .first;
```

**universal_ble:**

```dart
// Ask for Bluetooth permissions (throws if the user denies them)
await UniversalBle.requestPermissions();

// Check Bluetooth is on
final state = await UniversalBle.getBluetoothAvailabilityState();
if (state != AvailabilityState.poweredOn) {
  // Show a "turn on Bluetooth" screen
}

// React to changes
UniversalBle.availabilityStream.listen((state) {
  // poweredOn, poweredOff, unauthorized, unsupported, ...
});
```

On Android, `requestPermissions()` asks for the Bluetooth permissions, and on Windows, Linux and Web it always succeeds. If you already use permission_handler, you can keep it.

---

## Step 3: Scanning

flutter_blue_plus gives you the whole, de-duplicated list of results each time. universal_ble emits each device as it's seen, so keep your own map.

**flutter_blue_plus:**

```dart
final subscription = FlutterBluePlus.onScanResults.listen((results) {
  for (final r in results) {
    print('${r.device.remoteId} ${r.advertisementData.advName} ${r.rssi}');
  }
});

await FlutterBluePlus.startScan(
  withServices: [Guid('180d')],
  timeout: const Duration(seconds: 10),
);
```

**universal_ble:**

```dart
final devices = <String, BleDevice>{};

final subscription = UniversalBle.scanStream.listen((BleDevice device) {
  devices[device.deviceId] = device; // the same device can arrive more than once
  print('${device.deviceId} ${device.name} ${device.rssi}');
});

await UniversalBle.startScan(
  scanFilter: ScanFilter(withServices: ['180d']),
);

// universal_ble has no scan timeout, so stop the scan yourself
await Future.delayed(const Duration(seconds: 10));
await UniversalBle.stopScan();
```

Two more differences:

- **UUIDs are plain strings.** Pass them in any format, such as `'180d'` or the full 128-bit form. universal_ble returns them in lowercase 128-bit form, so normalise your own with `BleUuidParser.string('180d')` before comparing.
- **The web needs your service list.** On the web, `withServices` is also the list of services your app may use after connecting, so always include the services you need there.

---

## Step 4: Connecting and Finding Characteristics

**flutter_blue_plus:**

```dart
final connectionSub = device.connectionState.listen((state) {
  if (state == BluetoothConnectionState.disconnected) {
    // reconnect, then discover services again
  }
});

// 2.x makes you declare your licence on every connect
await device.connect(license: License.commercial);

final services = await device.discoverServices();
final heartRate = services
    .firstWhere((s) => s.uuid == Guid('180d'))
    .characteristics
    .firstWhere((c) => c.uuid == Guid('2a37'));
```

**universal_ble:**

```dart
final connectionSub = bleDevice.connectionStream.listen((isConnected) {
  if (!isConnected) {
    // reconnect, then discover services again
  }
});

await bleDevice.connect();

await bleDevice.discoverServices();
final heartRate = await bleDevice.getCharacteristic('2a37', service: '180d');
```

universal_ble's README shows `getCharacteristic('180a', '2a56')`, but in version 2.3.0 the characteristic comes first and the service is a named parameter, as above.

Things to watch:

- **MTU.** flutter_blue_plus 2.x requests an MTU of 512 on Android as part of `connect()`. universal_ble doesn't, so if your writes rely on a larger MTU, call `requestMtu()` after connecting (Step 7).
- **Saved devices.** Store `deviceId` if you want to reconnect later. `UniversalBle.connect(deviceId)` takes the ID directly.
- **Timeouts.** `connect()` waits up to 60 seconds by default; pass `timeout:` to change it. Every other command runs through a queue with a 10-second timeout, set by `UniversalBle.timeout`. flutter_blue_plus defaulted to 35 seconds for connecting and 15 for reads and writes.
- **One command at a time.** By default, universal_ble runs every command in one global queue. That's safe but slow with several devices, so set `UniversalBle.queueType = QueueType.perDevice` to run each device's commands in parallel.

---

## Step 5: Reading and Writing

**flutter_blue_plus:**

```dart
List<int> value = await characteristic.read();

await characteristic.write([0x01, 0x02]);
await characteristic.write([0x01, 0x02], withoutResponse: true);
```

**universal_ble:**

```dart
Uint8List value = await characteristic.read();

await characteristic.write([0x01, 0x02]); // with response
await characteristic.write([0x01, 0x02], withResponse: false);
```

Watch the flag: flutter_blue_plus's `withoutResponse: true` becomes `withResponse: false`. Reads now return a fixed-length `Uint8List` instead of a `List<int>`, so copy the value first if your code adds to it. universal_ble has no equivalent of `allowLongWrite`, so split large payloads into MTU-sized chunks yourself. Our [MTU and large data guide](/blog/flutter-ble-mtu-negotiation-large-data-transfer) shows how.

---

## Step 6: Notifications and Indications

**flutter_blue_plus:**

```dart
final valueSub = characteristic.onValueReceived.listen((value) {
  // handle the value
});
device.cancelWhenDisconnected(valueSub);

await characteristic.setNotifyValue(true);
```

**universal_ble:**

```dart
final valueSub = characteristic.onValueReceived.listen((Uint8List value) {
  // handle the value
});

await characteristic.notifications.subscribe();
// or, for indications:
// await characteristic.indications.subscribe();

// later
await characteristic.unsubscribe();
await valueSub.cancel();
```

flutter_blue_plus picks notifications or indications for you. universal_ble makes you choose, and `subscribe()` throws if the characteristic doesn't support the one you picked. There's no `cancelWhenDisconnected`, so cancel your stream subscriptions when `connectionStream` reports a disconnect. [Notifications vs indications](/blog/flutter-ble-notifications-vs-indications) explains which to use.

---

## Step 7: MTU, Pairing and Disconnecting

**flutter_blue_plus:**

```dart
final mtu = await device.requestMtu(512);
await device.createBond();
await device.disconnect();
```

**universal_ble:**

```dart
final mtu = await bleDevice.requestMtu(512); // best-effort
await bleDevice.pair();
await bleDevice.disconnect();
```

- **MTU is a request, not a guarantee.** On iOS and macOS the operating system sets the MTU, so always size your packets from the value `requestMtu()` returns.
- **Pairing depends on the platform.** `pair()` triggers pairing on Android, Windows and Linux. On Apple platforms and the web, pairing starts automatically when you access an encrypted characteristic.

---

## Step 8: Handle Errors

flutter_blue_plus throws `FlutterBluePlusException`. universal_ble throws `UniversalBleException`, with `ConnectionException` and `PairingException` subtypes and a typed error `code`:

```dart
try {
  await bleDevice.connect();
} on ConnectionException catch (e) {
  if (e.code == UniversalBleErrorCode.connectionTimeout) {
    // retry with backoff
  }
} on UniversalBleException catch (e) {
  print('BLE error ${e.code}: ${e.message}');
}
```

---

## Test the Migration

Before you ship, run each of these on a real device, on every platform you support:

- Scan with your service filter, then again with Bluetooth off and with permissions denied
- Connect, discover services, and read and write every characteristic you use
- Subscribe to notifications and confirm values arrive
- Turn the peripheral off and on again to test your reconnect logic
- Put the app in the background, if your app uses BLE in the background

For unit tests, universal_ble lets you swap in your own platform implementation with `UniversalBle.setInstance()`, so you can test your BLE layer without hardware. Our [Flutter BLE testing guide](/blog/testing-flutter-ble-apps) covers the approach.

---

## Prefer to Keep the flutter_blue_plus API?

If rewriting your BLE calls is too much, there are two other free routes:

- **Pin flutter_blue_plus 1.36.8**, the last BSD-3-Clause release. It works today but gets no further fixes.
- **Switch to a fork.** flutter_blue_ultra and bluebird are BSD-3-Clause packages that keep flutter_blue_plus's API shape, so moving to them is mostly a find-and-replace. Both are young, with small user bases. Our [Flutter BLE packages comparison](/blog/flutter-ble-packages-comparison) covers them.

Migrating a commercial app and would rather not rebuild the plumbing? [BLE Starter](https://blestarter.com/?utm_source=blog&utm_medium=referral&utm_campaign=ble_starter&utm_content=migrate-flutter-blue-plus-to-universal-ble&utm_term=text) is a Flutter starter kit already built on universal_ble, with flutter_reactive_ble as a backup engine: permissions, scanning, auto-reconnect, GATT data, ESP32 OTA updates and tests, working together. It's in a founding pre-sale.

---

## Frequently Asked Questions

**Is universal_ble free for commercial use?**
Yes. universal_ble is released under the BSD-3-Clause licence, which allows commercial use with no licence fee. It's published by Navideck and supports Android, iOS, macOS, Windows, Linux and Web.

**Can universal_ble replace flutter_blue_plus in an existing app?**
Yes, for apps that connect to BLE devices. It covers scanning, connecting, service discovery, reads, writes, notifications, indications, MTU requests and pairing. The API is different, so every place your app calls flutter_blue_plus changes: device IDs and UUIDs are plain strings, scan results arrive one device at a time, and you choose notifications or indications explicitly.

**Can I keep the flutter_blue_plus API without paying for a licence?**
Yes. You can pin flutter_blue_plus 1.36.8, the last BSD-3-Clause release, which gets no further fixes. Or you can switch to flutter_blue_ultra or bluebird, two BSD-3-Clause packages that keep flutter_blue_plus's API shape. Both are young projects with small user bases.
