---
title: "Flutter BLE Peripheral Mode: Advertising and Running a GATT Server From Your Phone"
date: "2026-11-27"
excerpt: "Learn Flutter BLE peripheral mode: advertise from a phone, host a GATT server, and handle the iOS and Android limits flutter_blue_plus can't cover."
tags: ["Flutter", "BLE", "flutter_blue_plus", "BLE Peripheral", "GATT Server", "Advertising", "iOS", "Android"]
---

> **TL;DR:** `flutter_blue_plus` is a central-only library. It scans and connects, but it can't advertise or host a GATT server. For Flutter BLE peripheral mode you need a second plugin, such as `ble_peripheral` (a full GATT server) or `flutter_ble_peripheral` (advertising only). You also have to design around platform limits: iOS strips most advertising data and changes how it advertises in the background, and Android needs `BLUETOOTH_ADVERTISE` plus hardware that supports advertising.

Most Flutter BLE tutorials assume your phone is the **central**. It scans, connects to an ESP32 or a heart rate strap, and reads characteristics. That covers most apps. Sooner or later, though, you get a requirement that flips the roles: *"Can the phone act as the device?"*

Maybe you want two phones to exchange data without a server. Maybe you need a mobile "virtual sensor" so the firmware team can test their central code before the hardware exists. Maybe your hardware device is itself the central (a gateway, a smart lock reader, a kiosk) and the phone needs to show up as a credential. In each case the phone has to **advertise** and **serve GATT attributes**, and that's where developers hit their first wall: `flutter_blue_plus` has no API for it.

This guide covers what peripheral mode actually means, which Flutter packages support it, what a minimal GATT server looks like in Dart, and the platform limits that cause most "it works on Android but not iPhone" bug reports.

## Central vs Peripheral: A Quick Refresher

BLE defines two separate pairs of roles, and people often mix them up:

| Layer | Role A | Role B |
|---|---|---|
| **GAP** (discovery/connection) | **Central**: scans and starts connections | **Peripheral**: advertises and accepts connections |
| **GATT** (data) | **Client**: reads, writes, subscribes | **Server**: hosts services and characteristics |

In the usual setup, the peripheral is also the GATT server, and the central is the GATT client. When people say "Flutter BLE peripheral mode", they normally mean both: **the phone advertises, accepts a connection, and serves characteristics**.

If services, characteristics, and descriptors are still fuzzy, read [BLE GATT Profiles Explained](https://blog.blefluttercourse.com/blog/ble-gatt-profiles-explained) first. Everything below builds on that model.

## Why flutter_blue_plus Can't Do This

`flutter_blue_plus` wraps `CBCentralManager` on iOS and the central-side `BluetoothGatt` APIs on Android. Peripheral mode uses completely different native classes:

- **iOS/macOS:** `CBPeripheralManager`, `CBMutableService`, `CBMutableCharacteristic`
- **Android:** `BluetoothLeAdvertiser` and `BluetoothGattServer`

The maintainers have kept `flutter_blue_plus` focused on the central role, so you add a peripheral plugin alongside it. Both can run in the same app. One app can scan for devices with `flutter_blue_plus` and advertise its own service with a peripheral plugin, as long as you keep their state streams separate. For a comparison of the wider package landscape, see [Flutter BLE Packages Compared](https://blog.blefluttercourse.com/blog/flutter-ble-packages-comparison).

## Choosing a Peripheral Package

There are two main options:

- **`flutter_ble_peripheral`**: advertising only. Use it for beacon-style broadcasting, presence detection, or sending a small payload in the advertisement itself. It has no GATT server.
- **`ble_peripheral`**: a full GATT server. It runs on Android, iOS, macOS, and Windows, and supports services, characteristics, read and write callbacks, notifications, and subscription events. Use it when a central needs to connect and exchange data.

Several forks exist on pub.dev with fixes for specific edge cases. Check when each was last published and how its issue tracker looks before you commit. Peripheral plugins get much less maintenance than central ones.

## A Minimal GATT Server in Dart

Here's the skeleton using `ble_peripheral`. It sets up a custom service with one characteristic a central can read and subscribe to:

```dart
import 'dart:convert';
import 'package:ble_peripheral/ble_peripheral.dart';

const serviceUuid = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const txCharUuid  = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";

Future<void> startPeripheral() async {
  // Permissions must already be granted at this point
  await BlePeripheral.initialize();

  await BlePeripheral.addService(
    BleService(
      uuid: serviceUuid,
      primary: true,
      characteristics: [
        BleCharacteristic(
          uuid: txCharUuid,
          properties: [
            CharacteristicProperties.read.index,
            CharacteristicProperties.notify.index,
          ],
          permissions: [AttributePermissions.readable.index],
          value: null, // dynamic value -> served via read callback
        ),
      ],
    ),
  );

  BlePeripheral.setAdvertisingStatusUpdateCallback((advertising, error) {
    print("Advertising: $advertising, error: $error");
  });

  await BlePeripheral.startAdvertising(
    services: [serviceUuid],
    localName: "FlutterPeri",
  );
}
```

Pushing data to subscribed centrals is a single call:

```dart
await BlePeripheral.updateCharacteristic(
  characteristicId: txCharUuid,
  value: utf8.encode("hello central"),
);
```

This is enough to show up in nRF Connect and to see a notification arrive. (Our guide to [debugging Flutter BLE with nRF Connect](https://blog.blefluttercourse.com/blog/debugging-flutter-ble-nrf-connect) shows how to verify each step.) It's still far from production-ready. Nothing here handles a central that disconnects mid-stream, payloads bigger than the negotiated MTU, re-adding services after Bluetooth is toggled, or app lifecycle changes.

> **Building a real phone-as-peripheral feature?** The [BLE Flutter Course](https://blefluttercourse.com/) covers the complete implementation: a GATT server wrapped in a testable service class, connection tracking across platforms, MTU-aware chunked notifications, and recovery when the Bluetooth adapter restarts.

## Handling Reads, Writes, and Subscriptions

A GATT server is event-driven. The central decides when to read, write, or subscribe, and your app answers through callbacks:

```dart
BlePeripheral.setWriteRequestCallback((deviceId, characteristicId, offset, value) {
  // Parse the command the central sent
  final cmd = value == null ? null : utf8.decode(value);
  print("Write from $deviceId on $characteristicId: $cmd");
  return null; // or a WriteRequestResult with an error status
});

BlePeripheral.setCharacteristicSubscriptionChangeCallback(
  (deviceId, characteristicId, isSubscribed, name) {
    // Start/stop your data stream for this central
  },
);
```

There's an important platform difference here. **On Android you get a real connection-state callback. On iOS you don't.** `CBPeripheralManager` never tells you a central connected. You only find out when it subscribes, reads, or writes. If your logic depends on "a device is connected", track it through subscriptions on both platforms, or your iOS build will behave differently.

This mirrors the central side, where getting [reads, writes, and notifications](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics) right is most of the work. The difference is the direction.

## Platform Limits That Will Bite You

### iOS advertising is heavily restricted

With `CBPeripheralManager`, iOS lets you advertise only two things: the **local name** and a list of **service UUIDs**. You can't set custom manufacturer data from the public API, so the "pack sensor data into the advertisement" trick that works on Android isn't available on iPhone.

The legacy advertising packet holds about 31 bytes. A single 128-bit service UUID takes 18 of them, so long local names get cut off.

### iOS background advertising is different again

When your app goes to the background with the `bluetooth-peripheral` background mode enabled, iOS:

- drops the local name from the advertisement
- moves service UUIDs into an Apple-specific "overflow area"
- advertises less often

A non-Apple central (an Android phone or an ESP32) scanning with a service UUID filter usually **won't find** a backgrounded iPhone. Treat iOS background advertising as reliable only between Apple devices. Our [background mode guide](https://blog.blefluttercourse.com/blog/flutter-ble-background-mode-ios-android) covers this from the central side too.

### Android needs the right permission and hardware

On Android 12+ you need `BLUETOOTH_ADVERTISE` at runtime, in addition to `BLUETOOTH_CONNECT`. Some older or low-end devices also report that they don't support multiple advertisements, and advertising will fail silently. Always check the advertising status callback instead of assuming `startAdvertising` worked. The full permission setup is in [Flutter BLE Permissions on Android and iOS](https://blog.blefluttercourse.com/blog/flutter-ble-permissions-android-ios).

### Android may rotate your MAC address

Android peripherals advertise with a random, rotating address. A central that caches the MAC address will lose your phone after a rotation. Identify the peripheral by **service UUID** or a characteristic-level ID instead, which ties in with designing a proper [custom 128-bit service UUID](https://blog.blefluttercourse.com/blog/ble-uuid-custom-service-flutter).

> **Want the cross-platform version done right?** In the [BLE Flutter Course](https://blefluttercourse.com/) we build a phone peripheral that an ESP32 central can find reliably, including a fallback for iOS background limits and an advertisement layout that fits in 31 bytes.

## Common Pitfalls

1. **Advertising before services are added.** Add every service and wait for the service-added callback before calling `startAdvertising`. Otherwise centrals may find an empty GATT table.
2. **Forgetting the CCCD.** Notifications only reach a central that has subscribed by writing to the Client Characteristic Configuration Descriptor. If `updateCharacteristic` appears to do nothing, check that the central actually subscribed. See [Notifications vs Indications](https://blog.blefluttercourse.com/blog/flutter-ble-notifications-vs-indications).
3. **Sending payloads larger than the MTU.** A notification is limited to MTU − 3 bytes. Larger values get truncated or dropped. Chunk your data the same way as in our [MTU and large data transfer guide](https://blog.blefluttercourse.com/blog/flutter-ble-mtu-negotiation-large-data-transfer).
4. **Testing with only one phone.** You can't scan for your own advertisement from the same device. Use a second phone running nRF Connect, or an ESP32 ([ESP32 vs Arduino for Flutter BLE](https://blog.blefluttercourse.com/blog/esp32-vs-arduino-flutter-ble)), as the central.
5. **Ignoring Bluetooth toggles.** When the user turns Bluetooth off and on again, the GATT server and its services are torn down. Listen for adapter state changes and rebuild.

## Related Guides

- [Getting Started with BLE in Flutter](https://blog.blefluttercourse.com/blog/getting-started-ble-flutter)
- [Flutter BLE Scanning Guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide): useful for testing your peripheral from a second Flutter app
- [Build a Complete Flutter BLE App](https://blog.blefluttercourse.com/blog/build-complete-flutter-ble-app)
- [Handling Multiple BLE Devices in Flutter](https://blog.blefluttercourse.com/blog/flutter-ble-multiple-devices)
- [Testing Flutter BLE Apps](https://blog.blefluttercourse.com/blog/testing-flutter-ble-apps)
- [Flutter BLE Bonding, Pairing and Security](https://blog.blefluttercourse.com/blog/flutter-ble-bonding-pairing-security)

## FAQ

### Does flutter_blue_plus support peripheral mode?

No. `flutter_blue_plus` supports only the central (client) role. To advertise or host a GATT server from Flutter, add a dedicated plugin such as `ble_peripheral` or `flutter_ble_peripheral`. It can run alongside `flutter_blue_plus` in the same app.

### Can a Flutter app be a central and a peripheral at the same time?

Yes, on most modern Android phones and on iPhones. Use `flutter_blue_plus` for scanning and connecting, and a peripheral plugin for advertising and serving. Keep each role's state handling separate.

### Can I add manufacturer data to advertisements on iOS?

Not through the public `CBPeripheralManager` API. iOS advertisements can only carry the local name and service UUIDs. If you need to broadcast data without a connection, put it in a readable characteristic, or encode a small value into a custom service UUID.

### Why can't my ESP32 find my iPhone when the app is in the background?

In the background, iOS moves service UUIDs into a proprietary overflow area and removes the local name. Non-Apple centrals usually can't match on it. For reliable discovery, keep the app in the foreground or reverse the roles so the iPhone is the central.

### How do I test a Flutter BLE peripheral?

Use a second device as the central. nRF Connect on another phone is the fastest way to check advertising, the GATT table, reads, writes, and notifications. Then test against your real central (ESP32 firmware, another Flutter app) on both iOS and Android.

## Summary

Flutter BLE peripheral mode is possible, but it lives outside `flutter_blue_plus`. Choose `flutter_ble_peripheral` for advertising-only use cases or `ble_peripheral` for a full GATT server. Add your services before you advertise, and track "connected" through subscriptions so iOS and Android behave the same. Plan around iOS limits from the start: name and service UUIDs only, a degraded background mode, and around 31 bytes of advertising space.

The snippets above get a peripheral visible and sending its first notification. A production feature also needs to survive disconnects, MTU limits, Bluetooth toggles, and backgrounding on two very different platforms.

**Ready to build it properly?** The [BLE Flutter Course](https://blefluttercourse.com/) takes you from first scan to production-grade central *and* peripheral implementations with flutter_blue_plus, real ESP32 hardware, and the architecture patterns that keep BLE code maintainable. [Enroll at blefluttercourse.com →](https://blefluttercourse.com/)
